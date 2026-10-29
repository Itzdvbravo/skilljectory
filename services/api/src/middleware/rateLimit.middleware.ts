import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../common/errors/app-error.js';
import { prisma } from '../common/prisma.js';

export async function rateLimitSessionCreation(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next();

    // Check sessions created in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const count = await prisma.session.count({
      where: {
        host_id: userId,
        created_at: {
          gte: oneDayAgo,
        },
      },
    });

    if (count >= 10) {
      throw new ForbiddenError(
        'Daily session creation limit reached (maximum 10 sessions per 24 hours). Please try again tomorrow.'
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}
