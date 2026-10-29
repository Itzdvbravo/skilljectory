import { prisma } from '../../common/prisma.js';
import { BadRequestError } from '../../common/errors/app-error.js';
import { SkillProficiency, SkillType } from '@prisma/client';

export class SkillsService {
  static async searchSkills(q?: string) {
    if (!q || q.trim().length === 0) {
      return await prisma.skill.findMany({
        take: 30,
        orderBy: { display_name: 'asc' },
      });
    }

    const query = q.trim().toLowerCase();
    return await prisma.skill.findMany({
      where: {
        OR: [
          { name_normalized: { contains: query } },
          { display_name: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 30,
    });
  }

  static async tagUserSkill(
    userId: string,
    skillName: string,
    type: SkillType,
    proficiency: SkillProficiency = SkillProficiency.beginner,
    category: string = 'General'
  ) {
    const normalized = skillName.trim().toLowerCase();
    if (!normalized) {
      throw new BadRequestError('Skill name cannot be empty');
    }

    // Upsert skill
    const skill = await prisma.skill.upsert({
      where: { name_normalized: normalized },
      update: {},
      create: {
        name_normalized: normalized,
        display_name: skillName.trim(),
        category: category.trim(),
      },
    });

    // Link user_skill
    return await prisma.userSkill.upsert({
      where: {
        user_id_skill_id_type: {
          user_id: userId,
          skill_id: skill.id,
          type,
        },
      },
      update: {
        proficiency,
      },
      create: {
        user_id: userId,
        skill_id: skill.id,
        type,
        proficiency,
      },
      include: {
        skill: true,
      },
    });
  }

  static async getUserSkills(userId: string) {
    return await prisma.userSkill.findMany({
      where: { user_id: userId },
      include: { skill: true },
      orderBy: { created_at: 'desc' },
    });
  }
}
