const VALUE_THRESHOLD = 0.05; // minimum value edge

function impliedProbability(odd) {
  if (!odd || odd <= 1) return null;
  return 1 / odd;
}

function calcValueBet(realProb, odd) {
  if (!odd || odd <= 1 || !realProb) return null;
  return realProb * odd - 1;
}

function extractOdds(oddsData) {
  const odds = { odd1: null, oddX: null, odd2: null, oddOver: null, oddUnder: null, oddHH: null, oddHA: null };

  if (!oddsData || !Array.isArray(oddsData)) return odds;

  for (const entry of oddsData) {
    const bets = entry.bets || entry.values || [];
    const name = (entry.name || entry.bet || '').toLowerCase();

    if (name.includes('match winner') || name.includes('1x2') || name.includes('result')) {
      for (const b of bets) {
        const val = b.value || b.odd_value || '';
        const price = parseFloat(b.odd || b.price || 0);
        if (val === 'Home' || val === '1') odds.odd1 = price;
        if (val === 'Draw' || val === 'X') odds.oddX = price;
        if (val === 'Away' || val === '2') odds.odd2 = price;
      }
    }

    if (name.includes('goals over/under') || name.includes('over/under')) {
      for (const b of bets) {
        const val = (b.value || b.odd_value || '').toLowerCase();
        const price = parseFloat(b.odd || b.price || 0);
        if (val.includes('over') && val.includes('2.5')) odds.oddOver = price;
        if (val.includes('under') && val.includes('2.5')) odds.oddUnder = price;
      }
    }

    if (name.includes('asian handicap') || name.includes('handicap')) {
      for (const b of bets) {
        const val = (b.value || b.odd_value || '').toLowerCase();
        const price = parseFloat(b.odd || b.price || 0);
        if (val.includes('home') || val === '1') odds.oddHH = price;
        if (val.includes('away') || val === '2') odds.oddHA = price;
      }
    }
  }

  return odds;
}

function detectValueBets(probs, oddsData) {
  const odds = extractOdds(oddsData);
  const results = [];

  const checks = [
    { label: '1 (Local)', prob: probs.prob1, odd: odds.odd1 },
    { label: 'X (Empate)', prob: probs.probX, odd: odds.oddX },
    { label: '2 (Visitante)', prob: probs.prob2, odd: odds.odd2 },
    { label: 'Over 2.5', prob: probs.probOver, odd: odds.oddOver },
    { label: 'Under 2.5', prob: probs.probUnder, odd: odds.oddUnder },
    { label: 'Handicap Local', prob: probs.probHandicapHome, odd: odds.oddHH },
    { label: 'Handicap Visitante', prob: probs.probHandicapAway, odd: odds.oddHA },
  ];

  for (const { label, prob, odd } of checks) {
    if (!odd || !prob) continue;
    const implied = impliedProbability(odd);
    const value = calcValueBet(prob, odd);

    results.push({
      label,
      odd,
      impliedProb: implied ? (implied * 100).toFixed(1) + '%' : 'N/A',
      estimatedProb: (prob * 100).toFixed(1) + '%',
      value: value !== null ? value.toFixed(4) : null,
      isValueBet: value !== null && value > VALUE_THRESHOLD,
    });
  }

  return results;
}

module.exports = { detectValueBets };
