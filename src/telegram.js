require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TZ = 'America/Mexico_City';

function formatMatch(match, probs, valueBets) {
  const { home, away } = match._teams;
  const league = match.league?.name || match.tournament || match.competition?.name || '';
  const dateStr = match.date || match.datetime || match.fixture?.date;
  const time = dateStr
    ? new Date(dateStr).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
    : '?';
  const isLive = match.status === 'LIVE' || match.status === '1H' || match.status === '2H' || match.status === 'HT';
  const status = isLive ? ' 🔴EN VIVO' : '';

  let msg = `⚽ *${home} vs ${away}*${status}\n`;
  msg += `🏆 ${league} | 🕐 ${time} MX\n`;

  if (probs.source === 'stats') {
    msg += `📊 Goles esp: ${probs.expectedHomeGoals.toFixed(1)}-${probs.expectedAwayGoals.toFixed(1)} | 1:${(probs.prob1*100).toFixed(0)}% X:${(probs.probX*100).toFixed(0)}% 2:${(probs.prob2*100).toFixed(0)}%\n`;
  }

  for (const b of valueBets) {
    msg += `✅ *${b.label}* @ ${b.odd} → Edge: +${(b.edge * 100).toFixed(0)}%\n`;
  }

  return msg + '─'.repeat(28) + '\n';
}

async function sendReport(reports) {
  const now = new Date().toLocaleDateString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ,
  });
  const header = `🤖 *VALUE BETS DEL DÍA* — ${now}\n${'═'.repeat(28)}\n\n`;
  const footer = `\n📌 *${reports.length} partidos con value*`;

  const chunks = [];
  let current = header;

  for (const r of reports) {
    if (current.length + r.text.length > 4000) {
      chunks.push(current);
      current = '';
    }
    current += r.text;
  }
  chunks.push(current + footer);

  for (const chunk of chunks) {
    await bot.sendMessage(CHAT_ID, chunk, { parse_mode: 'Markdown' });
  }
}

async function sendError(msg) {
  await bot.sendMessage(CHAT_ID, `⚠️ *Value Bets Bot*\n${msg}`, { parse_mode: 'Markdown' });
}

module.exports = { formatMatch, sendReport, sendError };
