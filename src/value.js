const VALUE_THRESHOLD = 0.05;

function extractOdds(event) {
  // BSD API: odds embedded directly in event object
  return {
    odd1:     parseFloat(event.odds_home)        || null,
    oddX:     parseFloat(event.odds_draw)        || null,
    odd2:     parseFloat(event.odds_away)        || null,
    oddOver:  parseFloat(event.odds_over_25  || event.odds_over_2_5)  || null,
    oddUnder: parseFloat(event.odds_under_25 || event.odds_under_2_5) || null,
    oddHH:    parseFloat(event.odds_handicap_home || event.odds_ah_home) || null,
    oddHA:    parseFloat(event.odds_handicap_away || event.odds_ah_away) || null,
  };
}

function detectValueBets(probs, event) {
  const odds = extractOdds(event);
  const results = [];

  const checks = [
    { label: '1 Local',       prob: probs.prob1,           odd: odds.odd1 },
    { label: 'X Empate',      prob: probs.probX,           odd: odds.oddX },
    { label: '2 Visitante',   prob: probs.prob2,           odd: odds.odd2 },
    { label: 'Over 2.5',      prob: probs.probOver,        odd: odds.oddOver },
    { label: 'Under 2.5',     prob: probs.probUnder,       odd: odds.oddUnder },
    { label: 'H. Local',      prob: probs.probHandicapHome, odd: odds.oddHH },
    { label: 'H. Visitante',  prob: probs.probHandicapAway, odd: odds.oddHA },
  ];

  for (const { label, prob, odd } of checks) {
    if (!odd || odd <= 1 || !prob) continue;
    const value = prob * odd - 1;
    if (value > VALUE_THRESHOLD) {
      results.push({ label, odd, edge: value, prob });
    }
  }

  // Sort by edge descending
  return results.sort((a, b) => b.edge - a.edge);
}

module.exports = { detectValueBets };
