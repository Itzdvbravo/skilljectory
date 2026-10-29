import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function seedAdminToSupabase() {
  console.log('Seeding baseline reference records and Admin account to Supabase...');

  const dumpPath = path.resolve(__dirname, '../../admin-dump.json');
  if (!fs.existsSync(dumpPath)) {
    throw new Error(`admin-dump.json not found at ${dumpPath}`);
  }

  const data = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  const { admin, allSkills, allCustomizationOptions, allBadges } = data;

  // 1. Seed Skills
  console.log(`Seeding ${allSkills.length} skills...`);
  for (const s of allSkills) {
    await prisma.skill.upsert({
      where: { id: s.id },
      update: {
        name_normalized: s.name_normalized,
        display_name: s.display_name,
        category: s.category,
      },
      create: {
        id: s.id,
        name_normalized: s.name_normalized,
        display_name: s.display_name,
        category: s.category,
        created_at: new Date(s.created_at),
        updated_at: new Date(s.updated_at),
      },
    });
  }

  // 2. Seed Customization Options
  console.log(`Seeding ${allCustomizationOptions.length} customization options...`);
  for (const opt of allCustomizationOptions) {
    await prisma.customizationOption.upsert({
      where: { id: opt.id },
      update: {
        key: opt.key,
        label: opt.label,
        category: opt.category,
        unlock_type: opt.unlock_type,
        unlock_value: opt.unlock_value,
        tier: opt.tier,
      },
      create: {
        id: opt.id,
        key: opt.key,
        label: opt.label,
        category: opt.category,
        unlock_type: opt.unlock_type,
        unlock_value: opt.unlock_value,
        tier: opt.tier,
        created_at: new Date(opt.created_at),
        updated_at: new Date(opt.updated_at),
      },
    });
  }

  // 3. Seed Badges
  console.log(`Seeding ${allBadges.length} badges...`);
  for (const b of allBadges) {
    await prisma.badge.upsert({
      where: { id: b.id },
      update: {
        name: b.name,
        criteria_type: b.criteria_type,
        threshold: b.threshold,
      },
      create: {
        id: b.id,
        name: b.name,
        criteria_type: b.criteria_type,
        threshold: b.threshold,
        created_at: new Date(b.created_at),
        updated_at: new Date(b.updated_at),
      },
    });
  }

  // 4. Seed Admin User
  console.log(`Seeding Admin User: ${admin.email} (${admin.name})...`);
  await prisma.user.upsert({
    where: { id: admin.id },
    update: {
      email: admin.email,
      username: admin.username,
      password_hash: admin.password_hash,
      name: admin.name,
      student_id: admin.student_id,
      verification_method: admin.verification_method,
      verification_status: admin.verification_status,
      verified_at: admin.verified_at ? new Date(admin.verified_at) : null,
      verification_expires_at: admin.verification_expires_at ? new Date(admin.verification_expires_at) : null,
      signup_bonus_claimed: admin.signup_bonus_claimed,
      free_announcements_used: admin.free_announcements_used,
      free_announcement_window_start: admin.free_announcement_window_start ? new Date(admin.free_announcement_window_start) : null,
      status: admin.status,
      credit_balance: admin.credit_balance,
      unlocked_blogging_at: admin.unlocked_blogging_at ? new Date(admin.unlocked_blogging_at) : null,
    },
    create: {
      id: admin.id,
      email: admin.email,
      username: admin.username,
      password_hash: admin.password_hash,
      name: admin.name,
      student_id: admin.student_id,
      verification_method: admin.verification_method,
      verification_status: admin.verification_status,
      verified_at: admin.verified_at ? new Date(admin.verified_at) : null,
      verification_expires_at: admin.verification_expires_at ? new Date(admin.verification_expires_at) : null,
      signup_bonus_claimed: admin.signup_bonus_claimed,
      free_announcements_used: admin.free_announcements_used,
      free_announcement_window_start: admin.free_announcement_window_start ? new Date(admin.free_announcement_window_start) : null,
      status: admin.status,
      credit_balance: admin.credit_balance,
      unlocked_blogging_at: admin.unlocked_blogging_at ? new Date(admin.unlocked_blogging_at) : null,
      created_at: new Date(admin.created_at),
      updated_at: new Date(admin.updated_at),
    },
  });

  // 5. Seed Admin Profile
  if (admin.profile) {
    console.log('Seeding Admin Profile...');
    await prisma.profile.upsert({
      where: { user_id: admin.id },
      update: {
        bio: admin.profile.bio,
        video_url: admin.profile.video_url,
        avatar_url: admin.profile.avatar_url,
        course: admin.profile.course,
        department: admin.profile.department,
        enrollment_year: admin.profile.enrollment_year,
        years_of_study: admin.profile.years_of_study,
        current_year: admin.profile.current_year,
        resume_export_prefs_json: admin.profile.resume_export_prefs_json,
      },
      create: {
        id: admin.profile.id,
        user_id: admin.id,
        bio: admin.profile.bio,
        video_url: admin.profile.video_url,
        avatar_url: admin.profile.avatar_url,
        course: admin.profile.course,
        department: admin.profile.department,
        enrollment_year: admin.profile.enrollment_year,
        years_of_study: admin.profile.years_of_study,
        current_year: admin.profile.current_year,
        resume_export_prefs_json: admin.profile.resume_export_prefs_json,
        created_at: new Date(admin.profile.created_at),
        updated_at: new Date(admin.profile.updated_at),
      },
    });
  }

  // 6. Seed Admin Customizations
  if (admin.customizations && admin.customizations.length > 0) {
    console.log(`Seeding ${admin.customizations.length} Admin Customizations...`);
    for (const c of admin.customizations) {
      await prisma.userCustomization.upsert({
        where: {
          user_id_customization_option_id: {
            user_id: admin.id,
            customization_option_id: c.customization_option_id,
          },
        },
        update: {
          active: c.active,
          unlocked_at: new Date(c.unlocked_at),
        },
        create: {
          id: c.id,
          user_id: admin.id,
          customization_option_id: c.customization_option_id,
          active: c.active,
          unlocked_at: new Date(c.unlocked_at),
          created_at: new Date(c.created_at),
          updated_at: new Date(c.updated_at),
        },
      });
    }
  }

  // 7. Seed Admin Badges
  if (admin.user_badges && admin.user_badges.length > 0) {
    console.log(`Seeding ${admin.user_badges.length} Admin Badges...`);
    for (const ub of admin.user_badges) {
      await prisma.userBadge.upsert({
        where: {
          user_id_badge_id: {
            user_id: admin.id,
            badge_id: ub.badge_id,
          },
        },
        update: {
          earned_at: new Date(ub.earned_at),
        },
        create: {
          id: ub.id,
          user_id: admin.id,
          badge_id: ub.badge_id,
          earned_at: new Date(ub.earned_at),
        },
      });
    }
  }

  // 8. Seed Admin Credit Ledger
  if (admin.credit_ledger && admin.credit_ledger.length > 0) {
    console.log(`Seeding ${admin.credit_ledger.length} Credit Ledger Records for Admin...`);
    for (const cl of admin.credit_ledger) {
      await prisma.creditLedger.upsert({
        where: { id: cl.id },
        update: {
          amount: cl.amount,
          balance_after: cl.balance_after,
          type: cl.type,
          reference_type: cl.reference_type,
          reference_id: cl.reference_id,
        },
        create: {
          id: cl.id,
          user_id: admin.id,
          amount: cl.amount,
          balance_after: cl.balance_after,
          type: cl.type,
          reference_type: cl.reference_type,
          reference_id: cl.reference_id,
          created_at: new Date(cl.created_at),
        },
      });
    }
  }

  console.log('✅ Supabase database migration and admin data seeding complete!');
  process.exit(0);
}

seedAdminToSupabase().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
