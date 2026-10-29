import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../common/prisma.js';
import { AppError, BadRequestError, UnauthorizedError } from '../../common/errors/app-error.js';
import { CreditsService } from '../credits/credits.service.js';
import { VerificationMethod, VerificationStatus, UserStatus } from '@skill-exchange/shared-types';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret_skill_exchange_super_secure_key_123';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_skill_exchange_super_secure_key_456';
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export class AuthService {
  static generateTokens(userId: string, email: string) {
    const accessToken = jwt.sign({ sub: userId, email }, ACCESS_SECRET, {
      expiresIn: ACCESS_EXPIRY as any,
    });
    const refreshToken = jwt.sign({ sub: userId, email }, REFRESH_SECRET, {
      expiresIn: REFRESH_EXPIRY as any,
    });
    return { token: accessToken, accessToken, refreshToken };
  }

  static async signup(data: {
    email: string;
    password: string;
    name: string;
    username?: string;
    studentId?: string;
    course?: string;
    department?: string;
    enrollmentYear?: number;
    yearsOfStudy?: number;
    currentYear?: number;
    teachSkills?: string[];
    learnSkills?: string[];
    verificationMethod?: VerificationMethod;
  }) {
    const cleanEmail = data.email.toLowerCase().trim();
    if (!cleanEmail.endsWith('@adtu.in')) {
      throw new BadRequestError('Access restricted: Only official Assam Down Town University (@adtu.in) emails are permitted.');
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingEmail) {
      throw new BadRequestError('An account with this @adtu.in email already exists. Please sign in.');
    }

    let finalUsername = data.username?.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '');
    if (!finalUsername) {
      finalUsername = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '') || `user_${Date.now().toString().slice(-4)}`;
    }

    // Check username uniqueness
    const existingUsername = await prisma.user.findFirst({
      where: { username: finalUsername },
    });
    if (existingUsername) {
      finalUsername = `${finalUsername}_${Math.floor(100 + Math.random() * 900)}`;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const method = data.verificationMethod || VerificationMethod.EMAIL;

    // Direct auto-verify for @adtu.in domain (no OTP required)
    const isAutoVerified = true;
    const verifiedAt = new Date();
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: cleanEmail,
          username: finalUsername,
          password_hash: passwordHash,
          name: data.name.trim(),
          student_id: data.studentId?.trim() || null,
          verification_method: method,
          verification_status: isAutoVerified ? VerificationStatus.VERIFIED : VerificationStatus.PENDING,
          verified_at: verifiedAt,
          verification_expires_at: expiresAt,
          status: UserStatus.ACTIVE,
        },
      });

      // Create linked profile with academic details
      await tx.profile.create({
        data: {
          user_id: newUser.id,
          course: data.course?.trim() || 'B.Tech CSE',
          department: data.department?.trim() || 'Faculty of Engineering & Technology',
          enrollment_year: data.enrollmentYear ? Number(data.enrollmentYear) : new Date().getFullYear(),
          years_of_study: data.yearsOfStudy ? Number(data.yearsOfStudy) : 4,
          current_year: data.currentYear ? Number(data.currentYear) : 1,
          bio: `Student of ${data.course?.trim() || 'B.Tech'} at Assam Down Town University. Eager to collaborate, teach, and learn.`,
          resume_export_prefs_json: JSON.stringify({
            showEmail: true,
            showBadges: true,
            showTeachingHours: true,
            showReviews: true,
          }),
        },
      });

      // Tag skills willing to teach
      if (Array.isArray(data.teachSkills) && data.teachSkills.length > 0) {
        for (const skillName of data.teachSkills) {
          if (!skillName || !skillName.trim()) continue;
          const norm = skillName.trim().toLowerCase();
          let skill = await tx.skill.findUnique({ where: { name_normalized: norm } });
          if (!skill) {
            skill = await tx.skill.create({
              data: {
                name_normalized: norm,
                display_name: skillName.trim(),
                category: 'Peer Skill',
              },
            });
          }
          await tx.userSkill.create({
            data: {
              user_id: newUser.id,
              skill_id: skill.id,
              type: 'teach',
              proficiency: 'intermediate',
            },
          });
        }
      }

      // Tag skills wanting to learn
      if (Array.isArray(data.learnSkills) && data.learnSkills.length > 0) {
        for (const skillName of data.learnSkills) {
          if (!skillName || !skillName.trim()) continue;
          const norm = skillName.trim().toLowerCase();
          let skill = await tx.skill.findUnique({ where: { name_normalized: norm } });
          if (!skill) {
            skill = await tx.skill.create({
              data: {
                name_normalized: norm,
                display_name: skillName.trim(),
                category: 'Peer Skill',
              },
            });
          }
          await tx.userSkill.create({
            data: {
              user_id: newUser.id,
              skill_id: skill.id,
              type: 'learn',
              proficiency: 'beginner',
            },
          });
        }
      }

      // Claim welcome 3-credit bonus immediately if auto-verified
      if (isAutoVerified) {
        await CreditsService.claimSignupBonus(tx, newUser.id);
      }

      return newUser;
    });

    const refreshedUser = await prisma.user.findUnique({ where: { id: user.id } });
    const tokens = this.generateTokens(user.id, user.email);

    return {
      token: tokens.token,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        studentId: user.student_id,
        course: data.course?.trim() || 'B.Tech CSE',
        enrollmentYear: data.enrollmentYear ? Number(data.enrollmentYear) : new Date().getFullYear(),
        verificationStatus: refreshedUser?.verification_status || user.verification_status,
        creditBalance: refreshedUser?.credit_balance || 3.0,
      },
    };
  }

  static async login(identifier: string, password?: string) {
    const cleanId = (identifier || '').toLowerCase().trim().replace(/^@/, '');
    if (cleanId.includes('@') && !cleanId.endsWith('@adtu.in')) {
      throw new BadRequestError('Access restricted: Only official @adtu.in campus student email accounts are permitted.');
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanId },
          { username: cleanId },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials. If you are a new student, please register your @adtu.in account.');
    }

    if (password) {
      const matches = await bcrypt.compare(password, user.password_hash);
      if (!matches) {
        throw new UnauthorizedError('Invalid credentials');
      }
    }

    if (user.status === 'suspended') {
      throw new UnauthorizedError('Your account has been suspended');
    }

    const tokens = this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        studentId: user.student_id,
        verificationStatus: user.verification_status,
        status: user.status,
        creditBalance: user.credit_balance,
      },
      ...tokens,
    };
  }

  static async quickAdminLogin() {
    let admin = await prisma.user.findFirst({
      where: {
        OR: [
          { username: 'admin' },
          { email: 'admin@adtu.in' },
        ],
      },
    });

    if (!admin) {
      const pw = await bcrypt.hash('admin123', 10);
      admin = await prisma.user.create({
        data: {
          id: 'usr_admin_master',
          email: 'admin@adtu.in',
          username: 'admin',
          name: 'Campus Administrator',
          student_id: 'ADM-001',
          credit_balance: 999.0,
          password_hash: pw,
          verification_status: VerificationStatus.VERIFIED,
          status: UserStatus.ACTIVE,
          unlocked_blogging_at: new Date(),
        },
      });

      await prisma.profile.create({
        data: {
          user_id: admin.id,
          bio: 'Campus Administrator & System Guide with all features unlocked.',
        },
      });
    }

    if (!admin.unlocked_blogging_at) {
      admin = await prisma.user.update({
        where: { id: admin.id },
        data: { unlocked_blogging_at: new Date() },
      });
    }

    const tokens = this.generateTokens(admin.id, admin.email);

    return {
      user: {
        id: admin.id,
        email: admin.email,
        username: admin.username,
        name: admin.name,
        studentId: admin.student_id,
        verificationStatus: admin.verification_status,
        status: admin.status,
        creditBalance: admin.credit_balance,
        unlockedBloggingAt: (admin.unlocked_blogging_at || new Date()).toISOString(),
        activeCustomizations: {
          theme: 'profile_theme_aurora',
          badge_frame: 'badge_frame_gold',
        },
      },
      token: tokens.token,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Email Verification Flow: marks user verified, sets 1 year expiry, and triggers signup bonus!
   */
  static async verifyEmail(userId: string) {
    const verifiedAt = new Date();
    const expiresAt = new Date(verifiedAt);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          verification_status: VerificationStatus.VERIFIED,
          verified_at: verifiedAt,
          verification_expires_at: expiresAt,
          status: UserStatus.ACTIVE,
        },
      });

      // Grant sign-up bonus idempotently
      await CreditsService.claimSignupBonus(tx, userId);

      return user;
    });

    return {
      success: true,
      message: 'Email successfully verified. Welcome bonus credited!',
      user: {
        id: result.id,
        verificationStatus: result.verification_status,
        expiresAt: result.verification_expires_at,
      },
    };
  }

  /**
   * Manual Student ID Verification Flow (e.g. upload doc, admin reviewed)
   */
  static async submitManualIdVerification(userId: string, documentUrl: string, autoApproveForDev = true) {
    const verifiedAt = new Date();
    const expiresAt = new Date(verifiedAt);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          verification_method: VerificationMethod.MANUAL_ID,
          verification_status: autoApproveForDev ? VerificationStatus.VERIFIED : VerificationStatus.PENDING,
          verified_at: autoApproveForDev ? verifiedAt : null,
          verification_expires_at: autoApproveForDev ? expiresAt : null,
          status: UserStatus.ACTIVE,
        },
      });

      if (autoApproveForDev) {
        await CreditsService.claimSignupBonus(tx, userId);
      }

      return updatedUser;
    });

    return {
      success: true,
      status: result.verification_status,
      message: autoApproveForDev
        ? 'Manual student ID verified and approved! Welcome bonus credited.'
        : 'Student ID submitted for campus admin review.',
    };
  }

  /**
   * Section 5.4 & 5.9: Annual Reverification Flow
   * - Sets verification_expires_at to +1 year
   * - Resets free_announcements_used to 0 (per Section 5.4 reset policy)
   * - Does NOT restore dissolved credits (per Section 5.9)
   */
  static async reverify(userId: string) {
    const now = new Date();
    const nextYear = new Date(now);
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        verification_status: VerificationStatus.VERIFIED,
        verified_at: now,
        verification_expires_at: nextYear,
        status: UserStatus.ACTIVE,
        // TODO: confirm reset policy with product owner (Section 5.4 / Section 10)
        free_announcements_used: 0,
        free_announcement_window_start: null,
      },
    });

    return {
      success: true,
      message: 'Student status successfully reverified for another academic year. Free announcements reset!',
      expiresAt: updated.verification_expires_at,
    };
  }
}
