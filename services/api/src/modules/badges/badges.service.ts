import { prisma } from '../../common/prisma.js';
import { BadgeCriteriaType, NotificationType, SessionStatus } from '@prisma/client';

export class BadgesService {
  static async evaluateAndAwardBadges(userId: string) {
    const [user, badges, existingBadges] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          hosted_sessions: {
            where: { status: SessionStatus.completed },
            include: {
              participants: {
                where: { rating: { not: null } },
              },
            },
          },
        },
      }),
      prisma.badge.findMany(),
      prisma.userBadge.findMany({
        where: { user_id: userId },
      }),
    ]);

    if (!user) return [];

    const existingBadgeIds = new Set(existingBadges.map((b) => b.badge_id));
    const totalHoursTaught = user.hosted_sessions.reduce((s, sess) => s + sess.duration_hours, 0);

    const ratings: number[] = [];
    user.hosted_sessions.forEach((s) => {
      s.participants.forEach((p) => {
        if (p.rating) ratings.push(p.rating);
      });
    });

    const averageRating =
      ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;

    const newlyAwarded: string[] = [];

    for (const badge of badges) {
      if (existingBadgeIds.has(badge.id)) continue;

      let qualified = false;
      if (badge.criteria_type === BadgeCriteriaType.hours) {
        qualified = totalHoursTaught >= badge.threshold;
      } else if (badge.criteria_type === BadgeCriteriaType.rating) {
        qualified = ratings.length >= 3 && averageRating >= badge.threshold;
      }

      if (qualified) {
        await prisma.$transaction(async (tx) => {
          await tx.userBadge.create({
            data: {
              user_id: userId,
              badge_id: badge.id,
            },
          });

          // Insert notification row in same transaction (Section 4 & Section 8.4)
          await tx.notification.create({
            data: {
              user_id: userId,
              type: NotificationType.badge_unlocked,
              reference_type: 'badge',
              reference_id: badge.id,
              title: 'Achievement Unlocked!',
              body: `${badge.name} — ${badge.threshold} ${badge.criteria_type === 'hours' ? 'teaching hours' : 'star rating'}!`,
              seen: false,
            },
          });
        });

        newlyAwarded.push(badge.name);
      }
    }

    return newlyAwarded;
  }
}
