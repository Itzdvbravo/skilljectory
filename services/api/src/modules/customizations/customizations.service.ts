import { prisma } from '../../common/prisma.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../common/errors/app-error.js';
import {
  CustomizationUnlockType,
  LedgerTransactionType,
  NotificationType,
  SessionStatus,
} from '@prisma/client';
import { CreditsService } from '../credits/credits.service.js';

export class CustomizationsService {
  /**
   * Section 8.2: Catalog with lock state and progress preview for the current user
   */
  static async getCatalog(userId: string) {
    const [user, options, userCustomizations, userBalance, completedSessionsCount] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { username: true, email: true },
        }),
        prisma.customizationOption.findMany({
          orderBy: [{ category: 'asc' }, { tier: 'asc' }],
        }),
        prisma.userCustomization.findMany({
          where: { user_id: userId },
        }),
        CreditsService.getBalance(userId),
        prisma.session.count({
          where: {
            host_id: userId,
            status: SessionStatus.completed,
          },
        }),
      ]);

    const isAdmin = user?.username === 'admin' || user?.email === 'admin@adtu.in';

    const unlockedMap = new Map<string, { active: boolean }>();
    userCustomizations.forEach((uc) => {
      unlockedMap.set(uc.customization_option_id, { active: uc.active });
    });

    return options.map((opt) => {
      // Free default items (unlock_value 0) or admin accounts have everything unlocked
      const isDefaultFree = opt.unlock_value === 0;
      const isUnlocked = isAdmin || isDefaultFree || unlockedMap.has(opt.id);
      const isActive = unlockedMap.get(opt.id)?.active || (isAdmin && (opt.key === 'badge_frame_gold' || opt.key === 'profile_theme_aurora')) || false;

      let progressValue = 0;
      if (opt.unlock_type === CustomizationUnlockType.credits) {
        progressValue = isAdmin ? 999 : userBalance;
      } else {
        progressValue = isAdmin ? 25 : completedSessionsCount;
      }

      return {
        id: opt.id,
        key: opt.key,
        label: opt.label,
        category: opt.category,
        tier: opt.tier,
        unlockType: opt.unlock_type,
        unlockValue: opt.unlock_value,
        isUnlocked,
        isActive,
        progressValue,
        canUnlock:
          !isUnlocked &&
          (opt.unlock_type === CustomizationUnlockType.credits
            ? userBalance >= opt.unlock_value
            : completedSessionsCount >= opt.unlock_value),
      };
    });
  }

  /**
   * Section 8.2: Unlock customization item
   * basic tier = credits-gated
   * advanced tier = session-gated
   */
  static async unlock(userId: string, optionId: string) {
    const option = await prisma.customizationOption.findUnique({
      where: { id: optionId },
    });

    if (!option) throw new NotFoundError('Customization option not found');

    const existing = await prisma.userCustomization.findUnique({
      where: {
        user_id_customization_option_id: {
          user_id: userId,
          customization_option_id: optionId,
        },
      },
    });

    if (existing) {
      throw new BadRequestError('Option is already unlocked');
    }

    return await prisma.$transaction(async (tx) => {
      if (option.unlock_type === CustomizationUnlockType.credits) {
        // Debit credits via credits module
        await CreditsService.applyTransaction(tx, {
          userId,
          amount: -option.unlock_value,
          type: LedgerTransactionType.profile_customization_cost,
          referenceType: 'customization',
          referenceId: option.id,
        });
      } else {
        // Enforce completed hosted sessions count
        const completedCount = await tx.session.count({
          where: {
            host_id: userId,
            status: SessionStatus.completed,
          },
        });

        if (completedCount < option.unlock_value) {
          throw new ForbiddenError(
            `Requires ${option.unlock_value} sessions taught. Current: ${completedCount}`
          );
        }
      }

      const unlocked = await tx.userCustomization.create({
        data: {
          user_id: userId,
          customization_option_id: optionId,
          active: false,
        },
      });

      // Notification for achievement popup
      await tx.notification.create({
        data: {
          user_id: userId,
          type: NotificationType.customization_unlocked,
          reference_type: 'customization',
          reference_id: option.id,
          title: 'Customization Unlocked!',
          body: `You unlocked the ${option.label} (${option.category})!`,
          seen: false,
        },
      });

      return unlocked;
    });
  }

  /**
   * Activate an unlocked customization item (only one active per category)
   */
  static async activate(userId: string, optionIdOrKey: string) {
    let target = await prisma.customizationOption.findUnique({
      where: { id: optionIdOrKey },
    });

    if (!target) {
      target = await prisma.customizationOption.findUnique({
        where: { key: optionIdOrKey },
      });
    }

    if (!target) throw new NotFoundError('Customization option not found');

    const unlocked = await prisma.userCustomization.findUnique({
      where: {
        user_id_customization_option_id: {
          user_id: userId,
          customization_option_id: target.id,
        },
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, email: true },
    });
    const isAdmin = user?.username === 'admin' || user?.email === 'admin@adtu.in';
    const isDefaultTheme = target.key === 'profile_theme_sunrise';

    if (!unlocked && !isAdmin && !isDefaultTheme && target.unlock_value > 0) {
      throw new ForbiddenError('You must unlock this customization before activating it');
    }

    return await prisma.$transaction(async (tx) => {
      // Ensure record exists if admin or default free
      if (!unlocked) {
        await tx.userCustomization.upsert({
          where: {
            user_id_customization_option_id: {
              user_id: userId,
              customization_option_id: target.id,
            },
          },
          update: {},
          create: {
            user_id: userId,
            customization_option_id: target.id,
            active: false,
          },
        });
      }

      // Deactivate all options in same category for user
      // Deactivate all options in same category for user
      const categoryOptions = await tx.customizationOption.findMany({
        where: { category: target.category },
        select: { id: true },
      });

      const optionIds = categoryOptions.map((o) => o.id);

      await tx.userCustomization.updateMany({
        where: {
          user_id: userId,
          customization_option_id: { in: optionIds },
        },
        data: { active: false },
      });

      // Activate selected
      return await tx.userCustomization.update({
        where: {
          user_id_customization_option_id: {
            user_id: userId,
            customization_option_id: target.id,
          },
        },
        data: { active: true },
      });
    });
  }
}
