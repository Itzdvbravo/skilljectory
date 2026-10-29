import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../common/errors/app-error.js';
import { VerificationStatus, UserStatus } from '@skill-exchange/shared-types';

export function requireVerifiedUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (req.user.verificationStatus === VerificationStatus.LAPSED) {
    return next(
      new ForbiddenError(
        'Your student verification has lapsed. Please reverify your student status in Settings to host or participate in sessions, purchase materials, or post content.'
      )
    );
  }

  if (req.user.verificationStatus !== VerificationStatus.VERIFIED) {
    return next(
      new ForbiddenError(
        'Active verified student status is required for this action. Please complete email or student ID verification.'
      )
    );
  }

  if (req.user.status === UserStatus.LAPSED_UNVERIFIED || req.user.status === UserStatus.SUSPENDED) {
    return next(new ForbiddenError('Account is currently inactive or lapsed'));
  }

  next();
}
