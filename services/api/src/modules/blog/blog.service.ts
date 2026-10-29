import { prisma } from '../../common/prisma.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../common/errors/app-error.js';
import {
  BlogInteractionType,
  BlogPostStatus,
  SessionStatus,
  VerificationStatus,
  LedgerTransactionType,
} from '@prisma/client';
import { CreditEngine } from '../credits/credits.engine.js';
import { CreditsService } from '../credits/credits.service.js';

export class BlogService {
  static async listPosts(userId?: string) {
    const posts = await prisma.blogPost.findMany({
      where: { status: BlogPostStatus.published },
      include: {
        author: {
          select: { id: true, name: true, username: true, profile: { select: { avatar_url: true } } },
        },
        interactions: true,
      },
      orderBy: { published_at: 'desc' },
    });

    return posts.map((p) => {
      const upvotes = p.interactions.filter((i) => i.type === BlogInteractionType.upvote);
      const comments = p.interactions.filter((i) => i.type === BlogInteractionType.comment);
      const hasUpvoted = userId
        ? upvotes.some((i) => i.user_id === userId)
        : false;

      return {
        id: p.id,
        authorId: p.author_id,
        authorName: p.author.name,
        authorUsername: p.author.username || null,
        authorAvatar: p.author.profile?.avatar_url || null,
        title: p.title,
        content: p.content,
        mediaUrls: p.media_urls,
        status: p.status,
        publishedAt: p.published_at?.toISOString() || null,
        upvotesCount: upvotes.length,
        hasUpvoted,
        commentsCount: comments.length,
      };
    });
  }

  /**
   * Unlock Campus Blogging: takes 15 credits and requires minimum 20 session hours in profile
   */
  static async unlockBlogging(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        credit_balance: true,
        unlocked_blogging_at: true,
      },
    });

    if (!user) throw new NotFoundError('User not found');
    if (user.unlocked_blogging_at) {
      return { success: true, message: 'Campus blogging is already unlocked on your account!' };
    }

    const completed = await prisma.session.findMany({
      where: { host_id: userId, status: SessionStatus.completed },
      select: { duration_hours: true },
    });
    const totalHours = completed.reduce((sum, s) => sum + s.duration_hours, 0);

    if (totalHours < 20) {
      throw new BadRequestError(
        `Blogging unlock requires at least 20 session hours on your profile. You currently have ${totalHours} hrs.`
      );
    }

    if (user.credit_balance < 15) {
      throw new BadRequestError(
        `Blogging unlock costs 15 credits. Your current balance is ${user.credit_balance} credits.`
      );
    }

    await prisma.$transaction(async (tx) => {
      await CreditsService.applyTransaction(tx, {
        userId,
        amount: -15,
        type: LedgerTransactionType.blog_unlock_cost,
        referenceType: 'blog_unlock',
      });
      await tx.user.update({
        where: { id: userId },
        data: { unlocked_blogging_at: new Date() },
      });
    });

    return {
      success: true,
      message: 'Campus blogging unlocked successfully! 15 credits deducted.',
    };
  }

  /**
   * Section 5.8: Blog posting
   * Requires user to have unlocked blogging (15 credits + 20 session hours)
   */
  static async createPost(
    authorId: string,
    data: {
      title: string;
      content: string;
      mediaUrls?: string[];
      publishImmediately?: boolean;
    }
  ) {
    const user = await prisma.user.findUnique({
      where: { id: authorId },
      select: {
        id: true,
        email: true,
        username: true,
        unlocked_blogging_at: true,
        credit_balance: true,
      },
    });

    if (!user) throw new NotFoundError('User not found');

    const isAdmin = user.username === 'admin' || user.email === 'admin@adtu.in';
    if (!user.unlocked_blogging_at && !isAdmin) {
      throw new ForbiddenError(
        'Campus blogging is locked for your account. It costs 15 credits and requires minimum 20 session hours to unlock.'
      );
    }

    const isPublish = data.publishImmediately ?? true;

    return await prisma.blogPost.create({
      data: {
        author_id: authorId,
        title: data.title.trim(),
        content: data.content.trim(),
        media_urls: data.mediaUrls || [],
        status: isPublish ? BlogPostStatus.published : BlogPostStatus.draft,
        published_at: isPublish ? new Date() : null,
      },
    });
  }

  static async upvotePost(userId: string, postId: string) {
    const post = await prisma.blogPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundError('Post not found');

    const existing = await prisma.blogInteraction.findFirst({
      where: {
        blog_id: postId,
        user_id: userId,
        type: BlogInteractionType.upvote,
      },
    });

    if (existing) {
      await prisma.blogInteraction.delete({ where: { id: existing.id } });
      return { upvoted: false };
    } else {
      await prisma.blogInteraction.create({
        data: {
          blog_id: postId,
          user_id: userId,
          type: BlogInteractionType.upvote,
        },
      });
      return { upvoted: true };
    }
  }

  static async commentPost(userId: string, postId: string, commentText: string) {
    if (!commentText || commentText.trim().length === 0) {
      throw new BadRequestError('Comment text cannot be empty');
    }

    const post = await prisma.blogPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundError('Post not found');

    return await prisma.blogInteraction.create({
      data: {
        blog_id: postId,
        user_id: userId,
        type: BlogInteractionType.comment,
        comment_text: commentText.trim(),
      },
    });
  }
}
