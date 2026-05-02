function calcTeamStats(matches, teamId) {
  let goalsScored = 0;
  let goalsConceded = 0;
  let homeMatches = 0;
  let awayMatches = 0;
  let homeWins = 0;
  let awayWins = 0;
  let overCount = 0;
  const total = matches.length;

  for (const m of matches) {
    // Support both Bizzoiro BSD format (home_team/away_team) and legacy (teams.home.id)
    const homeId = m.home_team?.id ?? m.home_team ?? m.teams?.home?.id;
    const isHome = String(homeId) === String(teamId);
    const homeGoals = m.home_score ?? m.goals?.home ?? m.score?.fulltime?.home ?? 0;
    const awayGoals = m.away_score ?? m.goals?.away ?? m.score?.fulltime?.away ?? 0;

    if (isHome) {
      goalsScored += homeGoals;
      goalsConceded += awayGoals;
      homeMatches++;
      if (homeGoals > awayGoals) homeWins++;
    } else {
      goalsScored += awayGoals;
      goalsConceded += homeGoals;
      awayMatches++;
      if (awayGoals > homeGoals) awayWins++;
    }

    if (homeGoals + awayGoals > 2.5) overCount++;
  }

  if (total === 0) {
    return {
      avgScored: 0,
      avgConceded: 0,
      overRate: 0,
      homeWinRate: 0,
      awayWinRate: 0,
    };
  }

  return {
    avgScored: goalsScored / total,
    avgConceded: goalsConceded / total,
    overRate: overCount / total,
    homeWinRate: homeMatches > 0 ? homeWins / homeMatches : 0,
    awayWinRate: awayMatches > 0 ? awayWins / awayMatches : 0,
  };
}

function estimateProbabilities(homeStats, awayStats) {
  // Expected goals using attack/defense averages
  const expectedHomeGoals = (homeStats.avgScored + awayStats.avgConceded) / 2;
  const expectedAwayGoals = (awayStats.avgScored + homeStats.avgConceded) / 2;
  const totalExpected = expectedHomeGoals + expectedAwayGoals;

  // 1X2 probabilities weighted by home/away performance
  const homeStrength = homeStats.homeWinRate * 0.6 + (expectedHomeGoals / (totalExpected || 1)) * 0.4;
  const awayStrength = awayStats.awayWinRate * 0.6 + (expectedAwayGoals / (totalExpected || 1)) * 0.4;
  const drawBase = 1 - homeStrength - awayStrength;

  const raw1 = Math.max(homeStrength, 0.05);
  const rawX = Math.max(drawBase, 0.1);
  const raw2 = Math.max(awayStrength, 0.05);
  const sumRaw = raw1 + rawX + raw2;

  const prob1 = raw1 / sumRaw;
  const probX = rawX / sumRaw;
  const prob2 = raw2 / sumRaw;

  // Over/Under 2.5
  const avgOverRate = (homeStats.overRate + awayStats.overRate) / 2;
  const probOver = Math.min(Math.max(avgOverRate, 0.1), 0.9);
  const probUnder = 1 - probOver;

  // Handicap: home -1
  const probHandicapHome = expectedHomeGoals - expectedAwayGoals > 1 ? 0.45 : 0.25;
  const probHandicapAway = expectedAwayGoals - expectedHomeGoals > 1 ? 0.45 : 0.25;

  return {
    expectedHomeGoals,
    expectedAwayGoals,
    prob1,
    probX,
    prob2,
    probOver,
    probUnder,
    probHandicapHome,
    probHandicapAway,
  };
}

module.exports = { calcTeamStats, estimateProbabilities };
