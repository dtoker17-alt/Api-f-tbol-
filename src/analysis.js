// Extract team names trying every possible BSD field variant
function extractTeams(match) {
  const home =
    match.home_team?.name ||
    match.home_team_name ||
    match.home_name ||
    match.localTeam?.name ||
    (typeof match.home_team === 'string' ? match.home_team : null) ||
    'Local';

  const away =
    match.away_team?.name ||
    match.away_team_name ||
    match.away_name ||
    match.visitorTeam?.name ||
    (typeof match.away_team === 'string' ? match.away_team : null) ||
    'Visitante';

  return { home, away };
}

function extractTeamId(field) {
  if (!field) return null;
  if (typeof field === 'object') return field.id;
  return field; // plain integer
}

function calcTeamStats(matches, teamId) {
  let goalsScored = 0, goalsConceded = 0;
  let homeWins = 0, homeTotal = 0;
  let awayWins = 0, awayTotal = 0;
  let overCount = 0;

  for (const m of matches) {
    const homeId = extractTeamId(m.home_team);
    const isHome = String(homeId) === String(teamId);
    const hg = m.home_score ?? m.goals?.home ?? m.score?.fulltime?.home ?? null;
    const ag = m.away_score ?? m.goals?.away ?? m.score?.fulltime?.away ?? null;
    if (hg === null || ag === null) continue;

    if (isHome) {
      goalsScored += hg; goalsConceded += ag; homeTotal++;
      if (hg > ag) homeWins++;
    } else {
      goalsScored += ag; goalsConceded += hg; awayTotal++;
      if (ag > hg) awayWins++;
    }
    if (hg + ag > 2.5) overCount++;
  }

  const total = homeTotal + awayTotal;
  if (total === 0) return null; // no usable data

  return {
    avgScored: goalsScored / total,
    avgConceded: goalsConceded / total,
    overRate: overCount / total,
    homeWinRate: homeTotal > 0 ? homeWins / homeTotal : 0.4,
    awayWinRate: awayTotal > 0 ? awayWins / awayTotal : 0.3,
  };
}

function estimateProbabilities(homeStats, awayStats) {
  const expH = (homeStats.avgScored + awayStats.avgConceded) / 2;
  const expA = (awayStats.avgScored + homeStats.avgConceded) / 2;
  const tot = expH + expA || 1;

  const s1 = homeStats.homeWinRate * 0.6 + (expH / tot) * 0.4;
  const s2 = awayStats.awayWinRate * 0.6 + (expA / tot) * 0.4;
  const sX = Math.max(1 - s1 - s2, 0.1);
  const sum = Math.max(s1, 0.05) + sX + Math.max(s2, 0.05);

  return {
    expectedHomeGoals: expH,
    expectedAwayGoals: expA,
    prob1: Math.max(s1, 0.05) / sum,
    probX: sX / sum,
    prob2: Math.max(s2, 0.05) / sum,
    probOver: Math.min(Math.max((homeStats.overRate + awayStats.overRate) / 2, 0.1), 0.9),
    probUnder: 1 - Math.min(Math.max((homeStats.overRate + awayStats.overRate) / 2, 0.1), 0.9),
    probHandicapHome: expH - expA > 1 ? 0.45 : 0.25,
    probHandicapAway: expA - expH > 1 ? 0.45 : 0.25,
    source: 'stats',
  };
}

module.exports = { calcTeamStats, estimateProbabilities, extractTeams, extractTeamId };
