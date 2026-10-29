import { prisma } from '../../common/prisma.js';

export class AnalyticsService {
  static async getSkillDemandAnalytics() {
    const latestReports = await prisma.skillDemandReport.findMany({
      orderBy: { generated_at: 'desc' },
      distinct: ['skill_id'],
      include: {
        skill: true,
      },
    });

    return latestReports.map((r) => ({
      skillId: r.skill_id,
      name: r.skill.display_name,
      category: r.skill.category,
      demandScore: r.demand_score,
      rarityScore: r.rarity_score,
      sampleSize: r.sample_size,
      generatedAt: r.generated_at.toISOString(),
    }));
  }
}
