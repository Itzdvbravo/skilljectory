import { prisma } from '../../common/prisma.js';
import { BadRequestError, NotFoundError } from '../../common/errors/app-error.js';
import { SocialPlatform, SessionStatus } from '@prisma/client';
import { validatePlatformUrl } from '../../common/validation/url-validator.js';

export class UsersService {
  static async getMe(userId: string) {
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

    if (!user) throw new NotFoundError('User not found');

    const isAdmin = user.username === 'admin' || user.email === 'admin@adtu.in';

    // Aggregate completed session teaching hours
    const completedHosted = await prisma.session.findMany({
      where: {
        host_id: userId,
        status: SessionStatus.completed,
      },
      select: { duration_hours: true },
    });

    const totalSessionHours = isAdmin
      ? 25.0
      : completedHosted.reduce((sum, s) => sum + s.duration_hours, 0);
    const sessionsTaughtCount = isAdmin ? 8 : completedHosted.length;

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

    if (!activeCustomizations.theme) {
      activeCustomizations.theme = 'profile_theme_sunrise';
    }

    if (isAdmin && !activeCustomizations.badge_frame) {
      activeCustomizations.badge_frame = 'badge_frame_gold';
      activeCustomizations.theme = 'profile_theme_aurora';
    }

    const teachSkills = user.user_skills
      .filter((us) => us.type === 'teach')
      .map((us) => us.skill.display_name);

    const learnSkills = user.user_skills
      .filter((us) => us.type === 'learn')
      .map((us) => us.skill.display_name);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      studentId: user.student_id,
      verificationMethod: user.verification_method,
      verificationStatus: user.verification_status,
      verifiedAt: user.verified_at?.toISOString() || null,
      verificationExpiresAt: user.verification_expires_at?.toISOString() || null,
      freeAnnouncementsUsed: user.free_announcements_used,
      status: user.status,
      bio: user.profile?.bio || null,
      avatarUrl: user.profile?.avatar_url || null,
      videoUrl: user.profile?.video_url || null,
      course: user.profile?.course || null,
      department: user.profile?.department || null,
      enrollmentYear: user.profile?.enrollment_year || null,
      yearsOfStudy: user.profile?.years_of_study || null,
      currentYear: user.profile?.current_year || null,
      teachSkills,
      learnSkills,
      unlockedBloggingAt: isAdmin
        ? (user.unlocked_blogging_at || new Date()).toISOString()
        : user.unlocked_blogging_at?.toISOString() || null,
      creditBalance: user.credit_balance,
      totalSessionHours,
      sessionsTaughtCount,
      socialLinks: user.social_links.map((sl) => ({
        id: sl.id,
        platform: sl.platform,
        url: sl.url,
        label: sl.label,
        displayOrder: sl.display_order,
      })),
      activeCustomizations,
      badges: user.user_badges.map((ub) => ({
        id: ub.id,
        badgeId: ub.badge_id,
        name: ub.badge.name,
        criteriaType: ub.badge.criteria_type,
        threshold: ub.badge.threshold,
        earnedAt: ub.earned_at.toISOString(),
      })),
    };
  }

  static async updateProfile(
    userId: string,
    data: {
      name?: string;
      username?: string;
      bio?: string;
      avatarUrl?: string;
      videoUrl?: string;
      resumeExportPrefsJson?: string;
    }
  ) {
    if (data.name || data.username) {
      const updateUserData: any = {};
      if (data.name) updateUserData.name = data.name.trim();
      if (data.username) {
        const cleanUser = data.username.toLowerCase().trim().replace(/^@/, '');
        const exists = await prisma.user.findFirst({
          where: { username: cleanUser, NOT: { id: userId } },
        });
        if (exists) {
          throw new BadRequestError('Username is already taken');
        }
        updateUserData.username = cleanUser;
      }
      await prisma.user.update({
        where: { id: userId },
        data: updateUserData,
      });
    }

    return await prisma.profile.upsert({
      where: { user_id: userId },
      update: {
        bio: data.bio,
        avatar_url: data.avatarUrl,
        video_url: data.videoUrl,
        resume_export_prefs_json: data.resumeExportPrefsJson,
      },
      create: {
        user_id: userId,
        bio: data.bio || '',
        avatar_url: data.avatarUrl,
        video_url: data.videoUrl,
        resume_export_prefs_json: data.resumeExportPrefsJson || '{}',
      },
    });
  }

  static async searchMentors(query?: string) {
    const q = (query || '').toLowerCase().trim().replace(/^@+/, '');
    const where: any = {
      status: 'active',
    };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      take: 15,
      select: {
        id: true,
        name: true,
        username: true,
        profile: { select: { avatar_url: true, bio: true } },
      },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username || u.name.toLowerCase().replace(/\s+/g, ''),
      avatarUrl: u.profile?.avatar_url || null,
      bio: u.profile?.bio || null,
    }));
  }

  static async addSocialLink(
    userId: string,
    data: {
      platform: SocialPlatform;
      url: string;
      label?: string;
      displayOrder?: number;
    }
  ) {
    // Server-side URL pattern validation (Section 4 & Section 9)
    if (!validatePlatformUrl(data.platform as any, data.url)) {
      throw new BadRequestError(
        `Invalid URL format for platform ${data.platform}. Please provide a valid profile link.`
      );
    }

    return await prisma.userSocialLink.upsert({
      where: {
        user_id_platform: {
          user_id: userId,
          platform: data.platform,
        },
      },
      update: {
        url: data.url.trim(),
        label: data.label?.trim() || null,
        display_order: data.displayOrder ?? 0,
      },
      create: {
        user_id: userId,
        platform: data.platform,
        url: data.url.trim(),
        label: data.label?.trim() || null,
        display_order: data.displayOrder ?? 0,
      },
    });
  }

  static async deleteSocialLink(userId: string, linkId: string) {
    const link = await prisma.userSocialLink.findFirst({
      where: { id: linkId, user_id: userId },
    });

    if (!link) throw new NotFoundError('Social link not found');

    return await prisma.userSocialLink.delete({
      where: { id: linkId },
    });
  }
}
