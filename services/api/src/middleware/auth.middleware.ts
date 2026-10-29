import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../common/errors/app-error.js';
import { prisma } from '../common/prisma.js';
import { UserStatus, VerificationStatus } from '@skill-exchange/shared-types';

export interface AuthenticatedUser {
  id: string;
  email: string;
  verificationStatus: VerificationStatus;
  status: UserStatus;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_ACCESS_SECRET || 'dev_access_secret_skill_exchange_super_secure_key_123';

    let payload: any;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        verification_status: true,
        status: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User does not exist');
    }

    if (user.status === 'suspended') {
      throw new UnauthorizedError('Account is suspended');
    }

    req.user = {
      id: user.id,
      email: user.email,
      verificationStatus: user.verification_status as VerificationStatus,
      status: user.status as UserStatus,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_ACCESS_SECRET || 'dev_access_secret_skill_exchange_super_secure_key_123';

    try {
      const payload: any = jwt.verify(token, secret);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          verification_status: true,
          status: true,
        },
      });

      if (user && user.status !== 'suspended') {
        req.user = {
          id: user.id,
          email: user.email,
          verificationStatus: user.verification_status as VerificationStatus,
          status: user.status as UserStatus,
        };
      }
    } catch {
      // Ignore token verification errors in optional middleware
    }

    next();
  } catch (error) {
    next();
  }
}
