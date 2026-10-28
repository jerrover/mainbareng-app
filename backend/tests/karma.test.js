const { KARMA_RULES, calculateKarmaAdjustment } = require('../src/services/karmaCalculator');

describe('Karma Score Calculator Service (FR-10)', () => {
  it('should increase score when user attends on time', () => {
    const res = calculateKarmaAdjustment(90, 'ATTEND_ON_TIME');
    expect(res.delta).toBe(2);
    expect(res.newScore).toBe(92);
    expect(res.isLockedFromHosting).toBe(false);
  });

  it('should cap maximum Karma score at 100', () => {
    const res = calculateKarmaAdjustment(99, 'COMMENDED_SPORTSMANSHIP');
    expect(res.newScore).toBe(100);
  });

  it('should deduct 20 points on NO_SHOW and trigger host lock if below 80', () => {
    const res = calculateKarmaAdjustment(85, 'NO_SHOW');
    expect(res.delta).toBe(-20);
    expect(res.newScore).toBe(65);
    expect(res.isLockedFromHosting).toBe(true);
    expect(res.statusLabel).toBe('WARNING');
  });

  it('should suspend user when score drops to 50 or below', () => {
    const res = calculateKarmaAdjustment(55, 'NO_SHOW');
    expect(res.newScore).toBe(35);
    expect(res.isSuspended).toBe(true);
    expect(res.statusLabel).toBe('SUSPENDED');
  });

  it('should throw error on invalid rule type', () => {
    expect(() => calculateKarmaAdjustment(80, 'UNKNOWN_RULE')).toThrow('Invalid Karma rule type');
  });
});
