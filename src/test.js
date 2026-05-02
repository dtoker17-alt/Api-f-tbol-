require('dotenv').config();
const { calcTeamStats, estimateProbabilities } = require('./analysis');
const { detectValueBets } = require('./value');
const { formatMatchReport, sendReport } = require('./telegram');

// Mock data simulating real Bizzoiro BSD response
const mockMatches = [
  {
    id: 1001,
    date: new Date().toISOString(),
    home_team: { id: 40, name: 'Liverpool' },
    away_team: { id: 33, name: 'Manchester United' },
    tournament: 'Premier League',
    odds_home: 1.85,
    odds_draw: 3.60,
    odds_away: 4.20,
    odds_over_25: 1.72,
    odds_under_25: 2.10,
    odds_handicap_home: 2.05,
    odds_handicap_away: 1.80,
  },
  {
    id: 1002,
    date: new Date().toISOString(),
    home_team: { id: 529, name: 'Barcelona' },
    away_team: { id: 541, name: 'Real Madrid' },
    tournament: 'La Liga',
    odds_home: 2.10,
    odds_draw: 3.40,
    odds_away: 3.30,
    odds_over_25: 1.65,
    odds_under_25: 2.25,
    odds_handicap_home: 2.30,
    odds_handicap_away: 1.65,
  },
  {
    id: 1003,
    date: new Date().toISOString(),
    home_team: { id: 489, name: 'AC Milan' },
    away_team: { id: 505, name: 'Inter' },
    tournament: 'Serie A',
    odds_home: 2.60,
    odds_draw: 3.10,
    odds_away: 2.70,
    odds_over_25: 1.90,
    odds_under_25: 1.90,
    odds_handicap_home: 2.90,
    odds_handicap_away: 1.45,
  },
];

// Mock last 10 matches per team
function mockTeamHistory(teamId, isStrongTeam) {
  return Array.from({ length: 10 }, (_, i) => ({
    id: 9000 + i,
    home_team: { id: teamId },
    away_team: { id: 99 },
    home_score: isStrongTeam ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 2),
    away_score: Math.floor(Math.random() * 2),
  }));
}

async function runTest() {
  console.log('🧪 Ejecutando prueba con datos simulados...\n');

  const reports = [];

  for (const match of mockMatches) {
    const homeId = match.home_team.id;
    const awayId = match.away_team.id;

    const homeMatches = mockTeamHistory(homeId, true);
    const awayMatches = mockTeamHistory(awayId, false);

    const homeStats = calcTeamStats(homeMatches, homeId);
    const awayStats = calcTeamStats(awayMatches, awayId);
    const probs = estimateProbabilities(homeStats, awayStats);
    const valueBets = detectValueBets(probs, match);
    const text = formatMatchReport(match, probs, valueBets);

    const hasValueBets = valueBets.some((b) => b.isValueBet);
    console.log(`✅ ${match.home_team.name} vs ${match.away_team.name} — Value bets: ${valueBets.filter(b => b.isValueBet).length}`);
    reports.push({ text, hasValueBets });
  }

  console.log('\n' + '═'.repeat(50));
  console.log('📋 PREVIEW DEL MENSAJE QUE RECIBIRÁS EN TELEGRAM:');
  console.log('═'.repeat(50) + '\n');
  for (const r of reports) {
    // Strip markdown for terminal display
    console.log(r.text.replace(/\*/g, ''));
  }
  console.log(`📌 Partidos con value bets: ${reports.filter(r => r.hasValueBets).length}/${reports.length}`);
}

runTest().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
