import {
  calculateCreditScoreAdjustment,
  CreditScoreRuleType
} from '../src/services/creditCalculator';

describe('Credit Score Calculator Service (FR-10)', () => {
  it('should increase score when user attends on time', () => {
    const res = calculateCreditScoreAdjustment(90, 'ATTEND_ON_TIME');
    expect(res.delta).toBe(2);
    expect(res.newScore).toBe(92);
    expect(res.isLockedFromHosting).toBe(false);
  });

  it('should cap maximum Credit Score at 100', () => {
    const res = calculateCreditScoreAdjustment(99, 'COMMENDED_SPORTSMANSHIP');
    expect(res.newScore).toBe(100);
  });

  it('should deduct 20 points on NO_SHOW and trigger host lock if below 80', () => {
    const res = calculateCreditScoreAdjustment(85, 'NO_SHOW');
    expect(res.delta).toBe(-20);
    expect(res.newScore).toBe(65);
    expect(res.isLockedFromHosting).toBe(true);
    expect(res.statusLabel).toBe('WARNING');
  });

  it('should suspend user when score drops to 50 or below', () => {
    const res = calculateCreditScoreAdjustment(55, 'NO_SHOW');
    expect(res.newScore).toBe(35);
    expect(res.isSuspended).toBe(true);
    expect(res.statusLabel).toBe('SUSPENDED');
  });

  it('should throw error on invalid rule type', () => {
    expect(() =>
      calculateCreditScoreAdjustment(80, 'UNKNOWN_RULE' as CreditScoreRuleType)
    ).toThrow('Invalid Credit Score rule type');
  });
});
