import {
  PrismaClient,
  CustomizationCategory,
  CustomizationTier,
  CustomizationUnlockType,
  BadgeCriteriaType,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Campus Skill Exchange database...');

  // 1. Seed Customization Catalog (Section 8.2)
  const customizationCatalog = [
    {
      key: 'profile_theme_sunrise',
      label: 'Sunrise Horizon Theme',
      category: CustomizationCategory.theme,
      tier: CustomizationTier.basic,
      unlock_type: CustomizationUnlockType.credits,
      unlock_value: 1,
    },
    {
      key: 'profile_theme_midnight',
      label: 'Midnight OLED Dark Theme',
      category: CustomizationCategory.theme,
      tier: CustomizationTier.basic,
      unlock_type: CustomizationUnlockType.credits,
      unlock_value: 1,
    },
    {
      key: 'banner_style_minimal',
      label: 'Clean Minimalist Showcase Banner',
      category: CustomizationCategory.banner,
      tier: CustomizationTier.basic,
      unlock_type: CustomizationUnlockType.credits,
      unlock_value: 2,
    },
    {
      key: 'badge_frame_bronze',
      label: 'Bronze Scholar Badge Frame',
      category: CustomizationCategory.badge_frame,
      tier: CustomizationTier.basic,
      unlock_type: CustomizationUnlockType.credits,
      unlock_value: 2,
    },
    {
      key: 'profile_theme_aurora',
      label: 'Aurora Borealis Gradient Theme',
      category: CustomizationCategory.theme,
      tier: CustomizationTier.advanced,
      unlock_type: CustomizationUnlockType.sessions,
      unlock_value: 3, // 3 sessions taught
    },
    {
      key: 'layout_featured_materials',
      label: 'Featured Study Materials Layout',
      category: CustomizationCategory.layout,
      tier: CustomizationTier.advanced,
      unlock_type: CustomizationUnlockType.sessions,
      unlock_value: 3, // 3 sessions taught
    },
    {
      key: 'banner_style_dynamic_stats',
      label: 'Dynamic Live Stats Banner',
      category: CustomizationCategory.banner,
      tier: CustomizationTier.advanced,
      unlock_type: CustomizationUnlockType.sessions,
      unlock_value: 4, // 4 sessions taught
    },
    {
      key: 'badge_frame_gold',
      label: 'Master Gold Prestige Badge Frame',
      category: CustomizationCategory.badge_frame,
      tier: CustomizationTier.advanced,
      unlock_type: CustomizationUnlockType.sessions,
      unlock_value: 5, // 5 sessions taught
    },
  ];

  for (const item of customizationCatalog) {
    await prisma.customizationOption.upsert({
      where: { key: item.key },
      update: item,
      create: item,
    });
  }
  console.log(`Seeded ${customizationCatalog.length} customization options.`);

  // 2. Seed Badges
  const badges = [
    {
      name: 'Mentor Level 1 — Campus Explorer',
      criteria_type: BadgeCriteriaType.hours,
      threshold: 5,
    },
    {
      name: 'Mentor Level 2 — Dedicated Scholar',
      criteria_type: BadgeCriteriaType.hours,
      threshold: 15,
    },
    {
      name: 'Mentor Level 3 — Senior Campus Mentor',
      criteria_type: BadgeCriteriaType.hours,
      threshold: 30,
    },
    {
      name: '5-Star Campus Guide',
      criteria_type: BadgeCriteriaType.rating,
      threshold: 4.8,
    },
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: badge,
      create: badge,
    });
  }
  console.log(`Seeded ${badges.length} badges.`);

  // 3. Seed Campus Skills
  const defaultSkills = [
    { name_normalized: 'react native', display_name: 'React Native', category: 'Mobile Engineering' },
    { name_normalized: 'python data structures', display_name: 'Python Data Structures', category: 'Computer Science' },
    { name_normalized: 'ui/ux glassmorphic design', display_name: 'UI/UX Glassmorphic Design', category: 'Design' },
    { name_normalized: 'organic chemistry', display_name: 'Organic Chemistry', category: 'Science' },
    { name_normalized: 'macroeconomics', display_name: 'Macroeconomics', category: 'Business' },
    { name_normalized: 'guitar & music theory', display_name: 'Guitar & Music Theory', category: 'Arts' },
    { name_normalized: 'public speaking', display_name: 'Public Speaking', category: 'Communication' },
    { name_normalized: 'postgresql & databases', display_name: 'PostgreSQL & Databases', category: 'Computer Science' },
  ];

  for (const s of defaultSkills) {
    await prisma.skill.upsert({
      where: { name_normalized: s.name_normalized },
      update: s,
      create: s,
    });
  }
  console.log(`Seeded ${defaultSkills.length} default campus skills.`);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
