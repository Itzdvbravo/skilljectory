import { prisma } from '../../common/prisma.js';
import { BannerSourceType } from '@prisma/client';
import { NotFoundError } from '../../common/errors/app-error.js';

export class BannersService {
  /**
   * Section 2 & Section 4: Templated social banner generation
   */
  static async generateSocialBanner(
    userId: string,
    sourceType: BannerSourceType,
    sourceId?: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) throw new NotFoundError('User not found');

    const title =
      sourceType === BannerSourceType.session
        ? 'Campus Skill Session Host'
        : sourceType === BannerSourceType.badge
        ? 'Verified Skill Badge Unlocked'
        : 'Student Achievement Showcase';

    // Generate responsive, vector-sharp SVG banner
    const svgBanner = `
      <svg width="800" height="418" viewBox="0 0 800 418" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="800" y2="418" gradientUnits="userSpaceOnUse">
            <stop stop-color="#0F172A"/>
            <stop offset="1" stop-color="#1E1B4B"/>
          </linearGradient>
          <linearGradient id="accent" x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse">
            <stop stop-color="#6366F1"/>
            <stop offset="1" stop-color="#EC4899"/>
          </linearGradient>
        </defs>
        <rect width="800" height="418" rx="24" fill="url(#bg)"/>
        <rect x="30" y="30" width="740" height="358" rx="16" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>
        <circle cx="700" cy="80" r="140" fill="#6366F1" fill-opacity="0.12" filter="blur(40px)"/>
        
        <!-- Campus Badge -->
        <rect x="60" y="60" width="160" height="32" rx="16" fill="rgba(99, 102, 241, 0.2)"/>
        <text x="140" y="81" fill="#818CF8" font-family="system-ui, sans-serif" font-weight="600" font-size="13" text-anchor="middle">CAMPUS EXCHANGE</text>

        <!-- Main Title & User Info -->
        <text x="60" y="150" fill="#FFFFFF" font-family="system-ui, sans-serif" font-weight="800" font-size="34">${title}</text>
        <text x="60" y="195" fill="#94A3B8" font-family="system-ui, sans-serif" font-weight="500" font-size="20">Verified Student: <tspan fill="#38BDF8" font-weight="700">${user.name}</tspan></text>
        
        <!-- Divider -->
        <rect x="60" y="240" width="680" height="2" fill="url(#accent)"/>

        <!-- Stats row -->
        <text x="60" y="290" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="14">STATUS</text>
        <text x="60" y="325" fill="#4ADE80" font-family="system-ui, sans-serif" font-weight="700" font-size="22">Verified Scholar</text>

        <text x="320" y="290" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="14">STUDENT ID</text>
        <text x="320" y="325" fill="#FFFFFF" font-family="system-ui, sans-serif" font-weight="700" font-size="22">${user.student_id || 'Campus Peer'}</text>

        <text x="560" y="290" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="14">EXCHANGE CREDITS</text>
        <text x="560" y="325" fill="#FBBF24" font-family="system-ui, sans-serif" font-weight="700" font-size="22">${user.credit_balance} Credits</text>
      </svg>
    `.trim();

    const bannerRecord = await prisma.socialBanner.create({
      data: {
        user_id: userId,
        source_type: sourceType,
        source_id: sourceId || null,
        image_url: `data:image/svg+xml;utf8,${encodeURIComponent(svgBanner)}`,
      },
    });

    return {
      id: bannerRecord.id,
      imageUrl: bannerRecord.image_url,
      svg: svgBanner,
    };
  }
}
