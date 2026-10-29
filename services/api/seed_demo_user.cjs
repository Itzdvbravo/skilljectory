const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function run() {
  const defaultPw = await bcrypt.hash('password123', 10);
  const adminPw = await bcrypt.hash('admin123', 10);

  const usersToSeed = [
    {
      id: 'usr_default_demo_scholar',
      email: 'scholar@campus.edu',
      username: 'alexrivera',
      name: 'Alex Rivera',
      student_id: 'CS-2024-889',
      credit_balance: 14.0,
      password_hash: defaultPw,
      verification_status: 'verified',
      status: 'active',
      bio: 'Campus peer mentor specializing in React Native, mobile performance, and distributed systems.',
    },
    {
      id: 'usr_sarah_chen',
      email: 'sarah.chen@adtu.in',
      username: 'sarahc',
      name: 'Sarah Chen',
      student_id: 'CS-2024-102',
      credit_balance: 22.0,
      password_hash: defaultPw,
      verification_status: 'verified',
      status: 'active',
      bio: 'Distributed Systems & Database engineering enthusiast.',
    },
    {
      id: 'usr_marcus_vance',
      email: 'marcus.vance@adtu.in',
      username: 'marcusv',
      name: 'Marcus Vance',
      student_id: 'CS-2024-345',
      credit_balance: 18.0,
      password_hash: defaultPw,
      verification_status: 'verified',
      status: 'active',
      bio: 'UI/UX Glassmorphic Design and Frontend Architect.',
    },
    {
      id: 'usr_priya_sharma',
      email: 'priya.s@adtu.in',
      username: 'priyasharma',
      name: 'Priya Sharma',
      student_id: 'CS-2024-512',
      credit_balance: 16.0,
      password_hash: defaultPw,
      verification_status: 'verified',
      status: 'active',
      bio: 'Data Structures, Algorithms and Competitive Coding.',
    },
    {
      id: 'usr_admin_master',
      email: 'admin@adtu.in',
      username: 'admin',
      name: 'Campus Administrator',
      student_id: 'ADM-001',
      credit_balance: 999.0,
      password_hash: adminPw,
      verification_status: 'verified',
      status: 'active',
      unlocked_blogging_at: new Date(),
      bio: 'Campus Administrator & System Guide with all features unlocked.',
    },
  ];

  for (const u of usersToSeed) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { id: u.id },
          { email: u.email },
          { username: u.username },
        ],
      },
    });

    if (!existing) {
      const created = await prisma.user.create({
        data: {
          id: u.id,
          email: u.email,
          username: u.username,
          name: u.name,
          student_id: u.student_id,
          password_hash: u.password_hash,
          verification_status: u.verification_status,
          status: u.status,
          credit_balance: u.credit_balance,
          unlocked_blogging_at: u.unlocked_blogging_at || null,
        },
      });

      await prisma.profile.create({
        data: {
          user_id: created.id,
          bio: u.bio,
          resume_export_prefs_json: JSON.stringify({
            showEmail: true,
            showBadges: true,
            showTeachingHours: true,
            showReviews: true,
          }),
        },
      });
      console.log(`User created: ${u.name} (@${u.username})`);
    } else {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          username: u.username,
          name: u.name,
          password_hash: u.password_hash,
          verification_status: u.verification_status,
          status: u.status,
          credit_balance: u.credit_balance,
          unlocked_blogging_at: u.unlocked_blogging_at !== undefined ? u.unlocked_blogging_at : existing.unlocked_blogging_at,
        },
      });

      await prisma.profile.upsert({
        where: { user_id: existing.id },
        update: { bio: u.bio },
        create: {
          user_id: existing.id,
          bio: u.bio,
        },
      });
      console.log(`User updated: ${u.name} (@${u.username})`);
    }
  }

  // Ensure Admin has all customizations unlocked
  const allCustomizations = await prisma.customizationOption.findMany();
  const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (adminUser) {
    for (const opt of allCustomizations) {
      await prisma.userCustomization.upsert({
        where: {
          user_id_customization_option_id: {
            user_id: adminUser.id,
            customization_option_id: opt.id,
          },
        },
        update: {
          active: opt.key.includes('sunrise') || opt.key.includes('gold'),
        },
        create: {
          user_id: adminUser.id,
          customization_option_id: opt.id,
          active: opt.key.includes('sunrise') || opt.key.includes('gold'),
        },
      });
    }
    console.log('Admin user granted all customization unlocks.');
  }

  console.log('Demo seed completed successfully!');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
