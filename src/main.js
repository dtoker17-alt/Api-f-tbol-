require('dotenv').config();
const { getTodayMatches, getTeamLastMatches, getEventDetail } = require('./api');
const { calcTeamStats, estimateProbabilities, extractTeams, extractTeamId } = require('./analysis');
const { detectValueBets } = require('./value');
const { formatMatch, sendReport } = require('./telegram');

function validateEnv() {
  const missing = ['BIZZOIRO_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']
    .filter(k => !process.env[k]);
  if (missing.length) throw new Error(`Variables faltantes: ${missing.join(', ')}`);
}

async function processMatch(match) {
  const homeId = extractTeamId(match.home_team);
  const awayId = extractTeamId(match.away_team);
  const fixtureId = match.id || match.fixture?.id;

  if (!homeId || !awayId || !fixtureId) return null;

  const [homeMatches, awayMatches, detail] = await Promise.all([
    getTeamLastMatches(homeId, 10).catch(() => []),
    getTeamLastMatches(awayId, 10).catch(() => []),
    getEventDetail(fixtureId).catch(() => match),
  ]);

  // Use detail (has embedded odds) or fallback to match itself
  const eventWithOdds = detail || match;

  const homeStats = calcTeamStats(homeMatches, homeId);
  const awayStats = calcTeamStats(awayMatches, awayId);

  // Skip if no historical data for both teams
  if (!homeStats && !awayStats) return null;

  const probs = estimateProbabilities(
    homeStats || { avgScored: 1, avgConceded: 1, overRate: 0.5, homeWinRate: 0.4, awayWinRate: 0.3 },
    awayStats || { avgScored: 1, avgConceded: 1, overRate: 0.5, homeWinRate: 0.4, awayWinRate: 0.3 },
  );

  const valueBets = detectValueBets(probs, eventWithOdds);
  if (valueBets.length === 0) return null; // skip matches without value bets

  match._teams = extractTeams(match);
  const text = formatMatch(match, probs, valueBets);
  return { text };
}

async function main() {
  validateEnv();

  console.log('🔍 Obteniendo partidos del día (México)...');
  const matches = await getTodayMatches();

  if (!matches.length) {
    console.log('No hay partidos hoy.');
    process.exit(0);
  }

  console.log(`📋 ${matches.length} partidos encontrados. Analizando...`);

  const reports = [];
  const batchSize = 5;

  for (let i = 0; i < matches.length; i += batchSize) {
    const batch = matches.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(m => processMatch(m).catch(() => null)));
    results.filter(Boolean).forEach(r => reports.push(r));
    if (i + batchSize < matches.length) await new Promise(r => setTimeout(r, 800));
  }

  if (!reports.length) {
    console.log('Sin value bets detectadas hoy.');
    process.exit(0);
  }

  console.log(`✅ ${reports.length} partidos con value bets. Enviando a Telegram...`);
  await sendReport(reports);
  console.log('📨 Listo.');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
