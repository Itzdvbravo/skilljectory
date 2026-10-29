import { prisma } from '../../common/prisma.js';
import { NotFoundError } from '../../common/errors/app-error.js';
import { SessionStatus } from '@prisma/client';

export class ShowcaseService {
  /**
   * Section 8.5: Public-facing resume/portfolio export view
   */
  static async getPublicShowcase(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        social_links: { orderBy: { display_order: 'asc' } },
        customizations: {
          where: { active: true },
          include: { option: true },
        },
        user_badges: {
          include: { badge: true },
        },
        user_skills: {
          include: { skill: true },
        },
      },
    });

    if (!user) throw new NotFoundError('Showcase portfolio not found');

    // Aggregate teaching hours and session count
    const completedHosted = await prisma.session.findMany({
      where: { host_id: userId, status: SessionStatus.completed },
      include: {
        skill: true,
        participants: {
          where: { rating: { not: null } },
          select: { rating: true, feedback_text: true, created_at: true },
        },
      },
      orderBy: { scheduled_at: 'desc' },
      take: 20,
    });

    const totalHours = completedHosted.reduce((sum, s) => sum + s.duration_hours, 0);

    // Collect anonymous ratings & testimonials
    const reviews: { rating: number; feedback: string; date: string }[] = [];
    completedHosted.forEach((s) => {
      s.participants.forEach((p) => {
        if (p.rating) {
          reviews.push({
            rating: p.rating,
            feedback: p.feedback_text || '',
            date: p.created_at.toISOString(),
          });
        }
      });
    });

    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 5.0;

    // Active customizations mapped by category
    const activeCustomizations: Record<string, string | null> = {
      theme: null,
      banner: null,
      badge_frame: null,
      layout: null,
      font: null,
    };
    user.customizations.forEach((c) => {
      activeCustomizations[c.option.category] = c.option.key;
    });

    return {
      userId: user.id,
      name: user.name,
      username: user.username,
      studentId: user.student_id,
      verificationStatus: user.verification_status,
      verifiedAt: user.verified_at?.toISOString() || null,
      bio: user.profile?.bio || null,
      avatarUrl: user.profile?.avatar_url || null,
      videoUrl: user.profile?.video_url || null,
      totalHoursTaught: totalHours,
      totalSessionsTaught: completedHosted.length,
      averageRating: Number(averageRating.toFixed(1)),
      totalReviewsCount: reviews.length,
      taughtSkills: user.user_skills
        .filter((us) => us.type === 'teach')
        .map((us) => ({
          name: us.skill.display_name,
          category: us.skill.category,
          proficiency: us.proficiency,
        })),
      badges: user.user_badges.map((ub) => ({
        name: ub.badge.name,
        criteriaType: ub.badge.criteria_type,
        threshold: ub.badge.threshold,
        earnedAt: ub.earned_at.toISOString(),
      })),
      socialLinks: user.social_links.map((sl) => ({
        platform: sl.platform,
        url: sl.url,
        label: sl.label,
      })),
      activeCustomizations,
      recentReviews: reviews.slice(0, 5),
    };
  }
}
