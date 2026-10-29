import { prisma } from '../common/prisma';
import fs from 'fs';

async function exportAdmin() {
  const admin = await prisma.user.findFirst({
    where: {
      OR: [{ username: 'admin' }, { email: 'admin@adtu.in' }]
    },
    include: {
      profile: true,
      customizations: {
        include: { option: true }
      },
      credit_ledger: true,
      user_badges: {
        include: { badge: true }
      },
      user_skills: {
        include: { skill: true }
      },
      social_links: true
    }
  });

  const allSkills = await prisma.skill.findMany();
  const allCustomizationOptions = await prisma.customizationOption.findMany();
  const allBadges = await prisma.badge.findMany();

  const exportData = {
    admin,
    allSkills,
    allCustomizationOptions,
    allBadges
  };

  fs.writeFileSync('./admin-dump.json', JSON.stringify(exportData, null, 2));
  console.log('Admin dump exported successfully!');
  process.exit(0);
}

exportAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
