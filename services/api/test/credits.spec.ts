import { describe, it, expect } from 'vitest';
import { CreditEngine, ECONOMY_CONFIG } from '../src/modules/credits/credits.engine.js';

describe('Credit Economy Engine (Section 5)', () => {
  describe('5.3 Multi-person Group Sessions', () => {
    it('calculates host payout with floor max(3, confirmed * duration)', () => {
      // 2 learners for 1 hour: 2 * 1 = 2 < 3 -> should be 3
      const result2Learners1Hour = CreditEngine.calculateGroupSessionEarnings(2, 1);
      expect(result2Learners1Hour.eligibleForPayout).toBe(true);
      expect(result2Learners1Hour.hostEarning).toBe(3); // Floor of 3 applied
      expect(result2Learners1Hour.attendeeCost).toBe(1);

      // 4 learners for 1.5 hours: 4 * 1.5 = 6 > 3 -> should be 6
      const result4Learners1_5Hour = CreditEngine.calculateGroupSessionEarnings(4, 1.5);
      expect(result4Learners1_5Hour.eligibleForPayout).toBe(true);
      expect(result4Learners1_5Hour.hostEarning).toBe(6);
      expect(result4Learners1_5Hour.attendeeCost).toBe(1.5);

      // 3 learners for 2 hours: 3 * 2 = 6
      const result3Learners2Hour = CreditEngine.calculateGroupSessionEarnings(3, 2);
      expect(result3Learners2Hour.eligibleForPayout).toBe(true);
      expect(result3Learners2Hour.hostEarning).toBe(6);
      expect(result3Learners2Hour.attendeeCost).toBe(2);
    });

    it('rejects payout if confirmed learners drop below 2 (no-show rollback)', () => {
      // 1 learner confirmed
      const result1Learner = CreditEngine.calculateGroupSessionEarnings(1, 2);
      expect(result1Learner.eligibleForPayout).toBe(false);
      expect(result1Learner.hostEarning).toBe(0);
      expect(result1Learner.attendeeCost).toBe(0);

      // 0 learners confirmed
      const result0Learner = CreditEngine.calculateGroupSessionEarnings(0, 1);
      expect(result0Learner.eligibleForPayout).toBe(false);
      expect(result0Learner.hostEarning).toBe(0);
    });
  });

  describe('5.5 Multi-Mentor Sessions', () => {
    it('calculates multi-mentor pool strictly WITHOUT floor', () => {
      // 2 mentors, 2 learners, 1 hour
      // Total pool = 2 learners * 1 hour = 2 credits
      // Each mentor gets: 2 / 2 = 1.0 credit
      // Note: NO floor of 3 applies here!
      const result2Mentors2Learners = CreditEngine.calculateMultiMentorEarnings(2, 2, 1);
      expect(result2Mentors2Learners.eligibleForPayout).toBe(true);
      expect(result2Mentors2Learners.totalPool).toBe(2.0);
      expect(result2Mentors2Learners.earningPerMentor).toBe(1.0);
      expect(result2Mentors2Learners.attendeeCost).toBe(1.0);

      // 2 mentors, 4 learners, 2 hours
      // Total pool = 4 * 2 = 8 credits
      // Each mentor gets: 8 / 2 = 4 credits
      const result2Mentors4Learners = CreditEngine.calculateMultiMentorEarnings(4, 2, 2);
      expect(result2Mentors4Learners.eligibleForPayout).toBe(true);
      expect(result2Mentors4Learners.totalPool).toBe(8.0);
      expect(result2Mentors4Learners.earningPerMentor).toBe(4.0);
      expect(result2Mentors4Learners.attendeeCost).toBe(2.0);

      // 3 mentors, 6 learners, 1.5 hours
      // Total pool = 6 * 1.5 = 9 credits
      // Each mentor gets: 9 / 3 = 3 credits
      const result3Mentors6Learners = CreditEngine.calculateMultiMentorEarnings(6, 3, 1.5);
      expect(result3Mentors6Learners.eligibleForPayout).toBe(true);
      expect(result3Mentors6Learners.totalPool).toBe(9.0);
      expect(result3Mentors6Learners.earningPerMentor).toBe(3.0);
    });

    it('rejects multi-mentor payout if learners < mentors', () => {
      // 3 mentors but only 2 learners show up
      const resultDeficit = CreditEngine.calculateMultiMentorEarnings(2, 3, 1.5);
      expect(resultDeficit.eligibleForPayout).toBe(false);
      expect(resultDeficit.totalPool).toBe(0);
      expect(resultDeficit.earningPerMentor).toBe(0);
    });

    it('rejects multi-mentor if fewer than 2 mentors', () => {
      const result1Mentor = CreditEngine.calculateMultiMentorEarnings(3, 1, 1);
      expect(result1Mentor.eligibleForPayout).toBe(false);
    });
  });

  describe('5.4 Public Announcement Rules', () => {
    it('allows 4 free announcements with 4-day cooldown', () => {
      const now = new Date('2026-10-27T12:00:00Z');

      // First announcement ever
      const first = CreditEngine.evaluateAnnouncementEligibility(0, null, now);
      expect(first.isFree).toBe(true);
      expect(first.chargeAmount).toBe(0);

      // Second announcement 2 days later (cooldown active -> charges 1 credit)
      const twoDaysLater = new Date('2026-10-29T12:00:00Z');
      const secondCooldown = CreditEngine.evaluateAnnouncementEligibility(1, now, twoDaysLater);
      expect(secondCooldown.isFree).toBe(false);
      expect(secondCooldown.chargeAmount).toBe(1.0);

      // Second announcement 5 days later (cooldown expired -> free!)
      const fiveDaysLater = new Date('2026-11-01T13:00:00Z');
      const secondAllowed = CreditEngine.evaluateAnnouncementEligibility(1, now, fiveDaysLater);
      expect(secondAllowed.isFree).toBe(true);
      expect(secondAllowed.chargeAmount).toBe(0);

      // 4 free uses already exhausted -> always charges 1 credit
      const exhausted = CreditEngine.evaluateAnnouncementEligibility(4, now, fiveDaysLater);
      expect(exhausted.isFree).toBe(false);
      expect(exhausted.chargeAmount).toBe(1.0);
    });
  });

  describe('5.8 Blog Unlock Gate Check', () => {
    it('requires both 15+ hours and 10+ credits balance', () => {
      // Not enough hours, not enough credits
      expect(CreditEngine.evaluateBlogUnlockGate(10, 5, false).canUnlock).toBe(false);

      // Enough hours, not enough credits
      expect(CreditEngine.evaluateBlogUnlockGate(16, 8, false).canUnlock).toBe(false);

      // Not enough hours, enough credits
      expect(CreditEngine.evaluateBlogUnlockGate(12, 12, false).canUnlock).toBe(false);

      // Both satisfied
      expect(CreditEngine.evaluateBlogUnlockGate(15, 10, false).canUnlock).toBe(true);
      expect(CreditEngine.evaluateBlogUnlockGate(20, 15, false).canUnlock).toBe(true);

      // Already unlocked user stays unlocked
      expect(CreditEngine.evaluateBlogUnlockGate(0, 0, true).canUnlock).toBe(true);
    });
  });

  describe('5.7 Monthly Credit Refill', () => {
    it('qualifies learners with 3+ sessions and low demand skills or no taught skills', () => {
      // < 3 sessions
      expect(CreditEngine.evaluateMonthlyRefillEligibility(2, [], 10).eligible).toBe(false);

      // 3 sessions, no taught skills
      expect(CreditEngine.evaluateMonthlyRefillEligibility(3, [], 10).eligible).toBe(true);

      // 4 sessions, taught skill in bottom quartile (score <= threshold)
      expect(CreditEngine.evaluateMonthlyRefillEligibility(4, [8, 25], 10).eligible).toBe(true);

      // 4 sessions, taught skills all high demand (> threshold)
      expect(CreditEngine.evaluateMonthlyRefillEligibility(4, [15, 30], 10).eligible).toBe(false);
    });
  });

  describe('5.8 Marketplace Price Validation', () => {
    it('enforces 1-5 credit range check constraint', () => {
      expect(CreditEngine.validateMaterialPrice(0)).toBe(false);
      expect(CreditEngine.validateMaterialPrice(1)).toBe(true);
      expect(CreditEngine.validateMaterialPrice(3)).toBe(true);
      expect(CreditEngine.validateMaterialPrice(5)).toBe(true);
      expect(CreditEngine.validateMaterialPrice(6)).toBe(false);
      expect(CreditEngine.validateMaterialPrice(2.5)).toBe(false);
    });
  });
});
