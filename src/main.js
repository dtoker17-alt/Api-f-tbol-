require('dotenv').config();
const { getTodayMatches, getTeamLastMatches, getOdds } = require('./api');
const { calcTeamStats, estimateProbabilities } = require('./analysis');
const { detectValueBets } = require('./value');
const { formatMatchReport, sendReport } = require('./telegram');

function validateEnv() {
  const required = ['BIZZOIRO_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Variables de entorno faltantes: ${missing.join(', ')}`);
  }
}

async function processMatch(match) {
  // Support Bizzoiro BSD format (home_team/away_team) and legacy (teams.home/away)
  const homeId = match.home_team?.id ?? match.home_team ?? match.teams?.home?.id;
  const awayId = match.away_team?.id ?? match.away_team ?? match.teams?.away?.id;
  const fixtureId = match.id || match.fixture?.id;

  if (!homeId || !awayId || !fixtureId) return null;

  // Odds embedded in event — getOdds fetches full event detail
  const [homeMatches, awayMatches, oddsData] = await Promise.all([
    getTeamLastMatches(homeId, 10).catch(() => []),
    getTeamLastMatches(awayId, 10).catch(() => []),
    getOdds(fixtureId).catch(() => match), // fallback to match itself (may already have odds)
  ]);

  const homeStats = calcTeamStats(homeMatches, homeId);
  const awayStats = calcTeamStats(awayMatches, awayId);
  const probs = estimateProbabilities(homeStats, awayStats);
  const valueBets = detectValueBets(probs, oddsData);
  const text = formatMatchReport(match, probs, valueBets);

  return {
    text,
    hasValueBets: valueBets.some((b) => b.isValueBet),
    fixtureId,
  };
}

async function main() {
  validateEnv();

  console.log('🔍 Obteniendo partidos del día...');
  const matches = await getTodayMatches();

  if (!matches || matches.length === 0) {
    console.log('No hay partidos disponibles hoy.');
    process.exit(0);
  }

  console.log(`📋 ${matches.length} partidos encontrados. Analizando...`);

  // Process in batches of 5 to avoid rate limiting
  const batchSize = 5;
  const reports = [];

  for (let i = 0; i < matches.length; i += batchSize) {
    const batch = matches.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((m) => processMatch(m).catch(() => null)));
    results.filter(Boolean).forEach((r) => reports.push(r));

    if (i + batchSize < matches.length) {
      await new Promise((res) => setTimeout(res, 1000));
    }
  }

  if (reports.length === 0) {
    console.log('No se pudo procesar ningún partido.');
    process.exit(0);
  }

  console.log(`✅ ${reports.length} partidos analizados. Enviando a Telegram...`);
  await sendReport(reports);
  console.log('📨 Reporte enviado correctamente.');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
