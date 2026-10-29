import { prisma } from '../common/prisma.js';
import { CreditEngine, ECONOMY_CONFIG } from '../modules/credits/credits.engine.js';
import { CreditsService } from '../modules/credits/credits.service.js';
import { LedgerTransactionType, SessionStatus } from '@prisma/client';

/**
 * Section 5.7 & Section 7: Monthly Credit Refill Job
 * Scheduled: 1st of month, 00:00 campus-local time
 * - Target: consumed 3+ sessions as learner in trailing 3 months AND taught skill in bottom quartile demand
 * - Idempotent: checks for existing monthly_refill row for the current calendar month
 */
export async function runMonthlyRefillJob() {
  console.log('[Job:MonthlyRefill] Starting monthly refill sweep...');

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  // 1. Get latest demand reports to compute bottom quartile threshold
  const reports = await prisma.skillDemandReport.findMany({
    orderBy: { generated_at: 'desc' },
    distinct: ['skill_id'],
  });

  const scores = reports.map((r) => r.demand_score).sort((a, b) => a - b);
  const quartileThreshold =
    scores.length > 0 ? scores[Math.floor(scores.length * 0.25)] : 10.0;

  const scoreMap = new Map<string, number>();
  reports.forEach((r) => scoreMap.set(r.skill_id, r.demand_score));

  // 2. Fetch all active users
  const users = await prisma.user.findMany({
    where: {
      status: 'active',
      verification_status: 'verified',
    },
    include: {
      user_skills: { where: { type: 'teach' } },
    },
  });

  let grantedCount = 0;

  for (const user of users) {
    // Check idempotency: already received refill this month?
    const existingThisMonth = await prisma.creditLedger.findFirst({
      where: {
        user_id: user.id,
        type: LedgerTransactionType.monthly_refill,
        created_at: { gte: startOfMonth },
      },
    });

    if (existingThisMonth) continue;

    // Count learner sessions consumed in trailing 3 months
    const learnerSessionsCount = await prisma.sessionParticipant.count({
      where: {
        user_id: user.id,
        role: 'learner',
        attendance_confirmed: true,
        session: {
          status: SessionStatus.completed,
          scheduled_at: { gte: threeMonthsAgo },
        },
      },
    });

    const taughtSkillsScores = user.user_skills.map(
      (s) => scoreMap.get(s.skill_id) ?? 0
    );

    const check = CreditEngine.evaluateMonthlyRefillEligibility(
      learnerSessionsCount,
      taughtSkillsScores,
      quartileThreshold
    );

    if (check.eligible) {
      await prisma.$transaction(async (tx) => {
        await CreditsService.applyTransaction(tx, {
          userId: user.id,
          amount: ECONOMY_CONFIG.MONTHLY_REFILL_CREDITS,
          type: LedgerTransactionType.monthly_refill,
          referenceType: 'monthly_stimulus',
          referenceId: `${now.getFullYear()}-${now.getMonth() + 1}`,
        });
      });
      grantedCount++;
    }
  }

  console.log(`[Job:MonthlyRefill] Finished. Granted stimulus to ${grantedCount} qualifying students.`);
  return { grantedCount };
}
