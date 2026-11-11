/**
 * Credit Score Calculator (FR-10)
 * Logika penyesuaian skor reputasi (0 - 100).
 * Threshold: 80 = Warning/Lock Host, 50 = Suspended.
 *
 * Penamaan mengikuti PRD resmi (Wave 1). Aturan, delta, dan threshold
 * tidak berubah, hanya penamaan. Kolom database sudah memakai credit_score.
 */

export const CREDIT_SCORE_RULES = {
  ATTEND_ON_TIME: 2, // Hadir tepat waktu di lapangan
  COMMENDED_SPORTSMANSHIP: 5, // Mendapat bintang 5 & commend rekan tim
  LATE_ARRIVAL: -5, // Datang terlambat > 15 menit
  NO_SHOW: -20, // Mangkir tanpa pembatalan h-2 jam
  TOXIC_REPORT_VERIFIED: -25 // Laporan perilaku toxic diverifikasi admin
} as const;

export type CreditScoreRuleType = keyof typeof CREDIT_SCORE_RULES;

export interface CreditScoreAdjustmentResult {
  previousScore: number;
  delta: number;
  newScore: number;
  isLockedFromHosting: boolean;
  isSuspended: boolean;
  statusLabel: 'EXCELLENT' | 'WARNING' | 'SUSPENDED';
}

export function calculateCreditScoreAdjustment(
  currentScore: number | string,
  ruleType: CreditScoreRuleType
): CreditScoreAdjustmentResult {
  const current = Number(currentScore);
  const delta = CREDIT_SCORE_RULES[ruleType];

  if (delta === undefined) {
    throw new Error(`Invalid Credit Score rule type: ${ruleType}`);
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
