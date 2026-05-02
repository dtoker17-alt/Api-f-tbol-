require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function formatMatchReport(match, probs, valueBets) {
  // Support Bizzoiro BSD format (home_team.name) and legacy (teams.home.name)
  const home = match.home_team?.name || match.teams?.home?.name || 'Local';
  const away = match.away_team?.name || match.teams?.away?.name || 'Visitante';
  const league = match.league?.name || match.competition?.name || match.tournament || '';
  const dateStr = match.date || match.datetime || match.fixture?.date;
  const time = dateStr
    ? new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  const valueBetsFound = valueBets.filter((b) => b.isValueBet);

  let msg = `⚽ *${home} vs ${away}*\n`;
  msg += `🏆 ${league} | 🕐 ${time}\n\n`;
  msg += `📊 *Goles esperados:* ${probs.expectedHomeGoals.toFixed(2)} - ${probs.expectedAwayGoals.toFixed(2)}\n\n`;

  msg += `📈 *Probabilidades estimadas:*\n`;
  msg += `  1 (Local): ${(probs.prob1 * 100).toFixed(1)}%\n`;
  msg += `  X (Empate): ${(probs.probX * 100).toFixed(1)}%\n`;
  msg += `  2 (Visit.): ${(probs.prob2 * 100).toFixed(1)}%\n`;
  msg += `  Over 2.5: ${(probs.probOver * 100).toFixed(1)}%\n`;
  msg += `  Under 2.5: ${(probs.probUnder * 100).toFixed(1)}%\n\n`;

  if (valueBetsFound.length > 0) {
    msg += `🎯 *VALUE BETS DETECTADAS:*\n`;
    for (const b of valueBetsFound) {
      const edge = (parseFloat(b.value) * 100).toFixed(1);
      msg += `  ✅ *${b.label}* @ ${b.odd}\n`;
      msg += `     Prob real: ${b.estimatedProb} | Impl: ${b.impliedProb} | Edge: +${edge}%\n`;
    }
  } else {
    msg += `❌ *Sin value bets en este partido*\n`;
  }

  msg += `\n${'─'.repeat(30)}\n`;
  return msg;
}

async function sendReport(matchReports) {
  const header = `🤖 *ANÁLISIS DE VALUE BETS*\n📅 ${new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })}\n${'═'.repeat(30)}\n\n`;

  const totalValue = matchReports.filter((r) => r.hasValueBets).length;
  const footer = `\n📌 *Partidos con value bets: ${totalValue}/${matchReports.length}*`;

  const chunks = [];
  let current = header;

  for (const r of matchReports) {
    if (current.length + r.text.length > 4000) {
      chunks.push(current);
      current = '';
    }
    current += r.text;
  }

  current += footer;
  chunks.push(current);

  for (const chunk of chunks) {
    await bot.sendMessage(CHAT_ID, chunk, { parse_mode: 'Markdown' });
  }
}

module.exports = { formatMatchReport, sendReport };
