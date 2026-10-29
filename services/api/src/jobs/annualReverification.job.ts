import { prisma } from '../common/prisma.js';
import { CreditsService } from '../modules/credits/credits.service.js';
import { UserStatus, VerificationStatus } from '@skill-exchange/shared-types';

/**
 * Section 5.9 & Section 7: Annual Reverification and Credit Dissolution Job
 * Runs daily: finds users past verification_expires_at and dissolves balance
 */
export async function runAnnualReverificationJob() {
  console.log('[Job:AnnualReverification] Starting reverification sweep...');

  const now = new Date();

  // Find expired verified users
  const expiredUsers = await prisma.user.findMany({
    where: {
      verification_status: VerificationStatus.VERIFIED,
      verification_expires_at: {
        lte: now,
      },
    },
  });

  let lapsedCount = 0;

  for (const user of expiredUsers) {
    await prisma.$transaction(async (tx) => {
      // 1. Mark status as lapsed
      await tx.user.update({
        where: { id: user.id },
        data: {
          verification_status: VerificationStatus.LAPSED,
          status: UserStatus.LAPSED_UNVERIFIED,
        },
      });

      // 2. Dissolve remaining credit balance with audit row (Section 5.9)
      await CreditsService.dissolveCreditsForLapsedUser(tx, user.id);
    });

    lapsedCount++;
  }

  console.log(`[Job:AnnualReverification] Finished. Processed ${lapsedCount} lapsed students.`);
  return { lapsedCount };
}
