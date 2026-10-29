import { prisma } from '../../common/prisma.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../common/errors/app-error.js';
import { LedgerTransactionType, MaterialType } from '@prisma/client';
import { CreditEngine } from '../credits/credits.engine.js';
import { CreditsService } from '../credits/credits.service.js';

export class MarketplaceService {
  static async listMaterials(userId?: string) {
    const materials = await prisma.material.findMany({
      include: {
        seller: {
          select: { id: true, name: true, profile: { select: { avatar_url: true } } },
        },
        purchases: userId ? { where: { buyer_id: userId } } : false,
      },
      orderBy: { created_at: 'desc' },
    });

    return materials.map((m) => ({
      id: m.id,
      sellerId: m.seller_id,
      sellerName: m.seller.name,
      sellerAvatar: m.seller.profile?.avatar_url || null,
      title: m.title,
      fileUrl: m.file_url,
      priceCredits: m.price_credits,
      type: m.type,
      createdAt: m.created_at.toISOString(),
      hasPurchased: userId ? (m.purchases as any[])?.length > 0 : false,
    }));
  }

  static async createMaterial(
    sellerId: string,
    data: {
      title: string;
      fileUrl: string;
      priceCredits: number;
      type: MaterialType;
    }
  ) {
    // Enforce 1-5 credit range check constraint (Section 5.8)
    if (!CreditEngine.validateMaterialPrice(data.priceCredits)) {
      throw new BadRequestError('Material price must be an integer between 1 and 5 credits');
    }

    if (!data.title || data.title.trim().length === 0) {
      throw new BadRequestError('Title is required');
    }

    return await prisma.material.create({
      data: {
        seller_id: sellerId,
        title: data.title.trim(),
        file_url: data.fileUrl.trim(),
        price_credits: data.priceCredits,
        type: data.type,
      },
    });
  }

  /**
   * Section 5.8: Atomic purchase transaction:
   * Debit buyer, credit seller, both rows reference material_purchases.id
   */
  static async purchaseMaterial(buyerId: string, materialId: string) {
    const material = await prisma.material.findUnique({
      where: { id: materialId },
    });

    if (!material) throw new NotFoundError('Material not found');

    if (material.seller_id === buyerId) {
      throw new BadRequestError('You cannot purchase your own study material');
    }

    const existingPurchase = await prisma.materialPurchase.findFirst({
      where: { buyer_id: buyerId, material_id: materialId },
    });

    if (existingPurchase) {
      throw new BadRequestError('You have already purchased this material');
    }

    return await prisma.$transaction(async (tx) => {
      // Create purchase row
      const purchase = await tx.materialPurchase.create({
        data: {
          buyer_id: buyerId,
          material_id: materialId,
          credits_paid: material.price_credits,
        },
      });

      // 1. Debit buyer
      await CreditsService.applyTransaction(tx, {
        userId: buyerId,
        amount: -material.price_credits,
        type: LedgerTransactionType.marketplace_purchase,
        referenceType: 'material_purchase',
        referenceId: purchase.id,
      });

      // 2. Credit seller
      await CreditsService.applyTransaction(tx, {
        userId: material.seller_id,
        amount: material.price_credits,
        type: LedgerTransactionType.marketplace_sale,
        referenceType: 'material_sale',
        referenceId: purchase.id,
      });

      return purchase;
    });
  }
}
