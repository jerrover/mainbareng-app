/**
 * Balanced Team Splitter (FR-07)
 * Algoritma pembagian 2 kubu berimbang (Team A & Team B)
 * berdasarkan kombinasi Skill Rating (SR) dan Karma Score.
 */

function splitTeams(players) {
  if (!Array.isArray(players) || players.length === 0) {
    return { teamA: [], teamB: [], ratingDiff: 0 };
  }

  // 1. Hitung skor efektif tiap pemain: bobot SR 80% + bobot Karma 20%
  const enriched = players.map((p) => {
    const sr = Number(p.skillRating || 1200);
    const karma = Number(p.karmaScore || 100);
    // Normalisasi: SR ~1000-2000, Karma 0-100 (dikalikan 15 agar skalanya seimbang)
    const effectivePower = sr * 0.8 + karma * 15 * 0.2;
    return { ...p, effectivePower };
  });

  // 2. Sort descending berdasarkan power
  enriched.sort((a, b) => b.effectivePower - a.effectivePower);

  const teamA = [];
  const teamB = [];
  let sumA = 0;
  let sumB = 0;

  // 3. Greedy Balance Allocation (Snake / Difference Minimization)
  enriched.forEach((player) => {
    if (sumA <= sumB) {
      teamA.push({ ...player, assignedTeam: 'A' });
      sumA += player.effectivePower;
    } else {
      teamB.push({ ...player, assignedTeam: 'B' });
      sumB += player.effectivePower;
    }
  });

  return {
    teamA,
    teamB,
    totalPowerA: Math.round(sumA),
    totalPowerB: Math.round(sumB),
    ratingDiff: Math.abs(Math.round(sumA - sumB))
  };
}

module.exports = { splitTeams };
