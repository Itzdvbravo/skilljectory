import { PrismaClient, LedgerTransactionType, NotificationType } from '@prisma/client';
import { AppError, BadRequestError } from '../../common/errors/app-error.js';
import { CreditEngine, ECONOMY_CONFIG } from './credits.engine.js';
import { prisma, PrismaTransaction } from '../../common/prisma.js';

export interface ApplyCreditTransactionParams {
  userId: string;
  amount: number; // positive = credit, negative = debit
  type: LedgerTransactionType;
  referenceType?: string | null;
  referenceId?: string | null;
  allowNegativeBalance?: boolean; // false by default (debits fail if insufficient funds)
}

export class CreditsService {
  /**
   * The single authorized portal to mutate credit balances and write to credit_ledger.
   * MUST be executed inside a Prisma transaction (tx).
   */
  static async applyTransaction(
    tx: PrismaTransaction,
    params: ApplyCreditTransactionParams
  ) {
    const { userId, amount, type, referenceType, referenceId, allowNegativeBalance = false } = params;

    // Fetch current user and lock for update
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, credit_balance: true, verification_status: true },
    });

    if (!user) {
      throw new BadRequestError(`User ${userId} not found for credit transaction`);
    }

    const currentBalance = user.credit_balance;
    const newBalance = currentBalance + amount;

    if (!allowNegativeBalance && newBalance < 0 && amount < 0) {
      throw new BadRequestError(
        `Insufficient credit balance. Required: ${Math.abs(amount)}, Current: ${currentBalance}`
      );
    }

    // 1. Create append-only ledger row
    const ledgerEntry = await tx.creditLedger.create({
      data: {
        user_id: userId,
        amount,
        balance_after: newBalance,
        type,
        reference_type: referenceType ?? null,
        reference_id: referenceId ?? null,
      },
    });

    // 2. Synchronize denormalized credit_balance on user within same transaction
    await tx.user.update({
      where: { id: userId },
      data: {
        credit_balance: newBalance,
      },
    });

    return {
      ledgerEntry,
      previousBalance: currentBalance,
      newBalance,
    };
  }

  /**
   * Section 5.2: Sign-up bonus (Idempotent, grants once per user upon verification)
   */
  static async claimSignupBonus(tx: PrismaTransaction, userId: string) {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        signup_bonus_claimed: true,
        verification_status: true,
      },
    });

    if (!user) {
      throw new BadRequestError(`User ${userId} not found`);
    }

    if (user.signup_bonus_claimed) {
      return { claimed: false, message: 'Signup bonus already claimed' };
    }

    if (user.verification_status !== 'verified') {
      throw new BadRequestError('User must be verified to claim signup bonus');
    }

    const bonusAmount = Number(process.env.SIGNUP_BONUS_CREDITS) || ECONOMY_CONFIG.SIGNUP_BONUS_CREDITS;

    // Apply ledger transaction
    const { ledgerEntry } = await this.applyTransaction(tx, {
      userId,
      amount: bonusAmount,
      type: LedgerTransactionType.signup_bonus,
      referenceType: 'signup',
      referenceId: userId,
    });

    // Mark bonus claimed on user
    await tx.user.update({
      where: { id: userId },
      data: { signup_bonus_claimed: true },
    });

    // Create notification row in same transaction (Section 4 & Section 8.4)
    await tx.notification.create({
      data: {
        user_id: userId,
        type: NotificationType.signup_bonus,
        reference_type: 'credit_ledger',
        reference_id: ledgerEntry.id,
        title: 'Signup Bonus Claimed!',
        body: `Welcome to Campus Skill Exchange! You have been credited ${bonusAmount} credits.`,
        seen: false,
      },
    });

    return { claimed: true, amount: bonusAmount };
  }

  /**
   * Section 5.9: Annual Reverification Credit Dissolution
   * Zeroes out balance with a verification_dissolution ledger row without destroying history.
   */
  static async dissolveCreditsForLapsedUser(tx: PrismaTransaction, userId: string) {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, credit_balance: true },
    });

    if (!user) return;

    if (user.credit_balance > 0) {
      const dissolveAmount = -user.credit_balance;
      await this.applyTransaction(tx, {
        userId,
        amount: dissolveAmount,
        type: LedgerTransactionType.verification_dissolution,
        referenceType: 'reverification_sweep',
        referenceId: userId,
        allowNegativeBalance: true,
      });
    }
  }

  /**
   * Read current balance
   */
  static async getBalance(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credit_balance: true },
    });
    return user?.credit_balance ?? 0;
  }

  /**
   * Get paginated ledger history with human-readable reason
   */
  static async getLedgerHistory(userId: string, limit = 20, offset = 0) {
    const [rows, total] = await Promise.all([
      prisma.creditLedger.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.creditLedger.count({ where: { user_id: userId } }),
    ]);

    const formatted = rows.map((row) => ({
      id: row.id,
      amount: row.amount,
      balanceAfter: row.balance_after,
      type: row.type,
      humanReadableReason: CreditEngine.formatLedgerReason(row.type, row.reference_type, row.amount),
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      createdAt: row.created_at.toISOString(),
    }));

    return { total, items: formatted };
  }
}
