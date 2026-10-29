import { prisma } from '../common/prisma.js';
import { SessionStatus } from '@prisma/client';

/**
 * Section 7: Skill Demand & Rarity Report Job
 * Schedule: Weekly
 * Aggregates completed sessions + user_skills to compute demand_score / rarity_score per skill
 */
export async function runDemandReportJob() {
  console.log('[Job:DemandReport] Starting weekly skill demand aggregation...');

  const now = new Date();
  const periodEnd = now;
  const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const skills = await prisma.skill.findMany({
    include: {
      sessions: {
        where: {
          status: SessionStatus.completed,
          created_at: { gte: periodStart, lte: periodEnd },
        },
        include: { participants: true },
      },
      user_skills: true,
    },
  });

  const reportsCreated: any[] = [];

  for (const skill of skills) {
    // Total learners who attended sessions for this skill in the past week
    const completedSessions = skill.sessions;
    let totalLearners = 0;
    completedSessions.forEach((s) => {
      totalLearners += s.participants.filter((p) => p.role === 'learner').length;
    });

    const teacherCount = skill.user_skills.filter((us) => us.type === 'teach').length;
    const learnerWishCount = skill.user_skills.filter((us) => us.type === 'learn').length;

    // Demand score: combination of active session volume + students wanting to learn
    const demandScore = Number((completedSessions.length * 3 + totalLearners * 2 + learnerWishCount * 1.5).toFixed(2));

    // Rarity score: high demand with very few teachers = highly rare skill
    const rarityScore = Number(
      (teacherCount === 0 ? demandScore * 2 : (demandScore + 1) / Math.max(1, teacherCount)).toFixed(2)
    );

    const report = await prisma.skillDemandReport.create({
      data: {
        skill_id: skill.id,
        period_start: periodStart,
        period_end: periodEnd,
        demand_score: demandScore,
        rarity_score: rarityScore,
        sample_size: completedSessions.length + skill.user_skills.length,
      },
    });

    reportsCreated.push(report);
  }

  console.log(`[Job:DemandReport] Generated demand reports for ${reportsCreated.length} campus skills.`);
  return reportsCreated;
}
