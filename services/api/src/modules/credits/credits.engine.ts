// Campus Skill Exchange Platform — Credit Economy Calculation Engine
// Governed strictly by Section 5 of skill_exchange_build_spec.md

export const VALID_SESSION_DURATIONS = [1, 1.5, 2, 2.5, 3] as const;
export type ValidSessionDuration = (typeof VALID_SESSION_DURATIONS)[number];

export const ECONOMY_CONFIG = {
  SIGNUP_BONUS_CREDITS: 3,
  GROUP_SESSION_HOST_COST: 1.0,
  MULTI_MENTOR_HOST_COST_PER_MENTOR: 1.5,
  ANNOUNCEMENT_PAID_COST: 1.0,
  FREE_ANNOUNCEMENTS_MAX: 4,
  FREE_ANNOUNCEMENT_COOLDOWN_DAYS: 4,
  MONTHLY_REFILL_CREDITS: 2.0,
  BLOG_UNLOCK_MIN_TOTAL_HOURS: 20.0,
  BLOG_UNLOCK_MIN_CREDIT_BALANCE: 15.0,
  BLOG_UNLOCK_FEE: 15.0,
  MATERIAL_PRICE_MIN: 1,
  MATERIAL_PRICE_MAX: 5,
};

export class CreditEngine {
  /**
   * Section 5.3: Group Sessions
   * - Host pays 1 credit fee at creation (non-refundable).
   * - On completion, host earns max(3, confirmed_participants * duration_hours).
   * - Attendees each pay 1 * duration_hours credits upon attendance confirmation.
   */
  static calculateGroupSessionEarnings(
    confirmedLearnersCount: number,
    durationHours: number
  ): { hostEarning: number; attendeeCost: number; eligibleForPayout: boolean } {
    if (confirmedLearnersCount < 2) {
      return {
        hostEarning: 0,
        attendeeCost: 0,
        eligibleForPayout: false,
      };
    }

    const hostEarning = Math.max(3.0, confirmedLearnersCount * durationHours);
    const attendeeCost = 1.0 * durationHours;

    return {
      hostEarning,
      attendeeCost,
      eligibleForPayout: true,
    };
  }

  /**
   * Section 5.5: Multi-Mentor Sessions
   * - Requires 2+ mentors.
   * - learners >= mentors hard constraint.
   * - Each mentor pays 1.5 credits co-host fee at creation (non-refundable).
   * - Total pool = confirmed_learners * duration_hours.
   * - NO FLOOR APPLIES TO THIS POOL (prevent abuse!).
   * - Each mentor earns pool / number_of_mentors.
   */
  static calculateMultiMentorEarnings(
    confirmedLearnersCount: number,
    mentorsCount: number,
    durationHours: number
  ): {
    totalPool: number;
    earningPerMentor: number;
    attendeeCost: number;
    eligibleForPayout: boolean;
  } {
    if (mentorsCount < 2 || confirmedLearnersCount < mentorsCount) {
      return {
        totalPool: 0,
        earningPerMentor: 0,
        attendeeCost: 0,
        eligibleForPayout: false,
      };
    }

    // No floor applies to multi-mentor pool!
    const totalPool = confirmedLearnersCount * durationHours;
    const earningPerMentor = totalPool / mentorsCount;
    const attendeeCost = 1.0 * durationHours;

    return {
      totalPool,
      earningPerMentor,
      attendeeCost,
      eligibleForPayout: true,
    };
  }

  /**
   * Section 5.4: Public Announcement
   * - 4 free uses, each at least 4 days after the previous free use.
   * - Returns whether announcement is free and what amount should be charged.
   */
  static evaluateAnnouncementEligibility(
    freeAnnouncementsUsed: number,
    lastFreeAnnouncementAt: Date | null,
    now: Date = new Date()
  ): { isFree: boolean; chargeAmount: number; reason: string } {
    if (freeAnnouncementsUsed < ECONOMY_CONFIG.FREE_ANNOUNCEMENTS_MAX) {
      if (!lastFreeAnnouncementAt) {
        return {
          isFree: true,
          chargeAmount: 0,
          reason: 'Initial free announcement used',
        };
      }

      const diffMs = now.getTime() - lastFreeAnnouncementAt.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays >= ECONOMY_CONFIG.FREE_ANNOUNCEMENT_COOLDOWN_DAYS) {
        return {
          isFree: true,
          chargeAmount: 0,
          reason: `Free announcement used (${freeAnnouncementsUsed + 1}/${ECONOMY_CONFIG.FREE_ANNOUNCEMENTS_MAX})`,
        };
      } else {
        return {
          isFree: false,
          chargeAmount: ECONOMY_CONFIG.ANNOUNCEMENT_PAID_COST,
          reason: `Free announcement cooldown active (${Math.ceil(ECONOMY_CONFIG.FREE_ANNOUNCEMENT_COOLDOWN_DAYS - diffDays)} days remaining); paid 1 credit`,
        };
      }
    }

    return {
      isFree: false,
      chargeAmount: ECONOMY_CONFIG.ANNOUNCEMENT_PAID_COST,
      reason: 'Free announcement allowance exhausted; paid 1 credit',
    };
  }

  /**
   * Section 5.8: Blog Unlock Gate
   * Requires total_session_hours >= 15 AND current_credit_balance >= 10.
   */
  static evaluateBlogUnlockGate(
    totalSessionHours: number,
    currentCreditBalance: number,
    alreadyUnlocked: boolean
  ): { canUnlock: boolean; missingRequirements: string[] } {
    if (alreadyUnlocked) {
      return { canUnlock: true, missingRequirements: [] };
    }

    const missing: string[] = [];
    if (totalSessionHours < ECONOMY_CONFIG.BLOG_UNLOCK_MIN_TOTAL_HOURS) {
      missing.push(
        `Requires at least ${ECONOMY_CONFIG.BLOG_UNLOCK_MIN_TOTAL_HOURS} total session hours (current: ${totalSessionHours} hrs)`
      );
    }
    if (currentCreditBalance < ECONOMY_CONFIG.BLOG_UNLOCK_MIN_CREDIT_BALANCE) {
      missing.push(
        `Requires at least ${ECONOMY_CONFIG.BLOG_UNLOCK_MIN_CREDIT_BALANCE} credits balance (current: ${currentCreditBalance} credits)`
      );
    }

    return {
      canUnlock: missing.length === 0,
      missingRequirements: missing,
    };
  }

  /**
   * Section 5.7: Monthly Credit Refill Eligibility
   * - Consumed 3+ sessions as learner in trailing 3 months.
   * - Taught skill is in bottom quartile demand (or user has no taught skills tagged).
   */
  static evaluateMonthlyRefillEligibility(
    learnerSessionsTrailing3Months: number,
    taughtSkillsDemandScores: number[],
    quartileThresholdDemandScore: number
  ): { eligible: boolean; reason: string } {
    if (learnerSessionsTrailing3Months < 3) {
      return {
        eligible: false,
        reason: `Consumed only ${learnerSessionsTrailing3Months} sessions in trailing 3 months (minimum 3 required)`,
      };
    }

    if (taughtSkillsDemandScores.length === 0) {
      return {
        eligible: true,
        reason: 'User has no taught skills tagged (structurally cannot earn)',
      };
    }

    // Check if any taught skill is <= bottom quartile threshold
    const hasLowDemandSkill = taughtSkillsDemandScores.some(
      (score) => score <= quartileThresholdDemandScore
    );

    if (hasLowDemandSkill) {
      return {
        eligible: true,
        reason: 'Taught skill falls into campus bottom demand quartile',
      };
    }

    return {
      eligible: false,
      reason: 'Taught skills have moderate to high campus demand',
    };
  }

  /**
   * Section 5.8: Material Price Bounds
   */
  static validateMaterialPrice(priceCredits: number): boolean {
    return (
      Number.isInteger(priceCredits) &&
      priceCredits >= ECONOMY_CONFIG.MATERIAL_PRICE_MIN &&
      priceCredits <= ECONOMY_CONFIG.MATERIAL_PRICE_MAX
    );
  }

  /**
   * Human readable reason formatter for ledger records (Section 8.1)
   */
  static formatLedgerReason(
    type: string,
    referenceType?: string | null,
    amount?: number
  ): string {
    const isCredit = (amount ?? 0) >= 0;
    switch (type) {
      case 'signup_bonus':
        return 'Welcome verification bonus';
      case 'session_earning':
        return isCredit ? 'Earnings from completed teaching session' : 'Session attendance fee';
      case 'session_host_cost':
        return 'Group session hosting anti-spam fee';
      case 'mentor_host_cost':
        return 'Multi-mentor session co-hosting fee';
      case 'announcement_cost':
        return 'Campus-wide session public announcement fee';
      case 'monthly_refill':
        return 'Monthly learner stimulus credit refill';
      case 'marketplace_sale':
        return 'Earnings from study material sale';
      case 'marketplace_purchase':
        return 'Study material purchase';
      case 'blog_unlock_cost':
        return 'Community blog publishing access unlock';
      case 'profile_customization_cost':
        return 'Profile showcase theme & badge customization';
      case 'verification_dissolution':
        return 'Annual verification expiry credit dissolution';
      default:
        return referenceType ? `Transaction for ${referenceType}` : 'Account credit adjustment';
    }
  }
}
