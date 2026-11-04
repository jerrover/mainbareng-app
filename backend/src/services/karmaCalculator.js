/**
 * Karma Score Calculator (FR-10)
 * Logika penyesuaian skor reputasi (0 - 100).
 * Threshold: 80 = Warning/Lock Host, 50 = Suspended.
 */

const KARMA_RULES = {
  ATTEND_ON_TIME: 2,         // Hadir tepat waktu di lapangan
  COMMENDED_SPORTSMANSHIP: 5,// Mendapat bintang 5 & commend rekan tim
  LATE_ARRIVAL: -5,          // Datang terlambat > 15 menit
  NO_SHOW: -20,              // Mangkir tanpa pembatalan h-2 jam
  TOXIC_REPORT_VERIFIED: -25 // Laporan perilaku toxic diverifikasi admin
};

function calculateKarmaAdjustment(currentScore, ruleType) {
  const current = Number(currentScore);
  const delta = KARMA_RULES[ruleType];

  if (delta === undefined) {
    throw new Error(`Invalid Karma rule type: ${ruleType}`);
  }

  // Bound within 0 to 100
  const nextScore = Math.min(100, Math.max(0, current + delta));

  return {
    previousScore: current,
    delta,
    newScore: nextScore,
    isLockedFromHosting: nextScore < 80,
    isSuspended: nextScore <= 50,
    statusLabel: nextScore > 80 ? 'EXCELLENT' : nextScore > 50 ? 'WARNING' : 'SUSPENDED'
  };
}

module.exports = {
  KARMA_RULES,
  calculateKarmaAdjustment
};
