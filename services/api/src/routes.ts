import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from './modules/auth/auth.service.js';
import { UsersService } from './modules/users/users.service.js';
import { SkillsService } from './modules/skills/skills.service.js';
import { SessionsService } from './modules/sessions/sessions.service.js';
import { CreditsService } from './modules/credits/credits.service.js';
import { MarketplaceService } from './modules/marketplace/marketplace.service.js';
import { BlogService } from './modules/blog/blog.service.js';
import { CustomizationsService } from './modules/customizations/customizations.service.js';
import { NotificationsService } from './modules/notifications/notifications.service.js';
import { ShowcaseService } from './modules/showcase/showcase.service.js';
import { AnalyticsService } from './modules/analytics/analytics.service.js';
import { BadgesService } from './modules/badges/badges.service.js';
import { BannersService } from './modules/banners/banners.service.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { requireVerifiedUser } from './middleware/verification.middleware.js';
import { rateLimitSessionCreation } from './middleware/rateLimit.middleware.js';

export const router = Router();

// ================= AUTH ROUTES =================
router.post('/auth/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.signup(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/auth/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/auth/admin-login', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.quickAdminLogin();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/auth/verify-email', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.verifyEmail(req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/auth/verify-id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { documentUrl } = req.body;
    const result = await AuthService.submitManualIdVerification(req.user!.id, documentUrl || 'https://campus.edu/id-doc.pdf');
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/auth/reverify', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.reverify(req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ================= USERS & PROFILE =================
router.get('/users/me', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await UsersService.getMe(req.user!.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.get('/users/mentors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mentors = await UsersService.searchMentors(req.query.q as string);
    res.json(mentors);
  } catch (err) {
    next(err);
  }
});

router.patch('/users/me/profile', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await UsersService.updateProfile(req.user!.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post('/users/me/social-links', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const link = await UsersService.addSocialLink(req.user!.id, req.body);
    res.status(201).json(link);
  } catch (err) {
    next(err);
  }
});

router.delete('/users/me/social-links/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await UsersService.deleteSocialLink(req.user!.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/users/:id/showcase', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const showcase = await ShowcaseService.getPublicShowcase(req.params.id);
    res.json(showcase);
  } catch (err) {
    next(err);
  }
});

// ================= SKILLS =================
router.get('/skills/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const skills = await SkillsService.searchSkills(req.query.q as string);
    res.json(skills);
  } catch (err) {
    next(err);
  }
});

router.post('/skills/tag', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { skillName, type, proficiency, category } = req.body;
    const tagged = await SkillsService.tagUserSkill(req.user!.id, skillName, type, proficiency, category);
    res.status(201).json(tagged);
  } catch (err) {
    next(err);
  }
});

// ================= SESSIONS =================
router.post('/sessions/preview', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const preview = await SessionsService.preview({
      userId: req.user!.id,
      sessionType: req.body.sessionType,
      durationHours: Number(req.body.durationHours),
      mentorsCount: req.body.mentorsCount ? Number(req.body.mentorsCount) : undefined,
      expectedLearners: req.body.expectedLearners ? Number(req.body.expectedLearners) : undefined,
    });
    res.json(preview);
  } catch (err) {
    next(err);
  }
});

// GET /sessions (scope=discover | my)
router.get('/sessions', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scope = (req.query.scope as 'discover' | 'my') || 'discover';
    const search = req.query.search as string;
    const sessions = await SessionsService.listSessions({
      userId: req.user?.id,
      scope,
      search,
    });
    res.json(sessions);
  } catch (err) {
    next(err);
  }
});

// GET /sessions/:id
router.get('/sessions/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await SessionsService.getSessionDetail(req.params.id, req.user?.id);
    res.json(session);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/sessions',
  authMiddleware,
  requireVerifiedUser,
  rateLimitSessionCreation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await SessionsService.createSession(req.user!.id, {
        sessionType: req.body.sessionType,
        skillId: req.body.skillId,
        title: req.body.title,
        description: req.body.description,
        skillsTags: req.body.skillsTags,
        targetLearnerName: req.body.targetLearnerName,
        durationHours: Number(req.body.durationHours),
        scheduledAt: new Date(req.body.scheduledAt),
        locationMode: req.body.locationMode,
        meetingLink: req.body.meetingLink || req.body.meetingUrl || req.body.meeting_link,
        locationAddress: req.body.locationAddress,
        coMentorIds: req.body.coMentorIds,
        coMentorUsernames: req.body.coMentorUsernames,
        maxParticipants: req.body.maxParticipants ? Number(req.body.maxParticipants) : undefined,
        isPrivate: req.body.isPrivate,
        announcedImmediately: Boolean(req.body.announcedImmediately || req.body.announceImmediately),
      });
      res.status(201).json(session);
    } catch (err) {
      next(err);
    }
  }
);

router.post('/sessions/:id/mentor-response', authMiddleware, requireVerifiedUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await SessionsService.respondToMentorRequest(
      req.user!.id,
      req.params.id,
      Boolean(req.body.accept)
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/sessions/:id/join', authMiddleware, requireVerifiedUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const participant = await SessionsService.joinSession(req.user!.id, req.params.id, req.body.joinCode);
    res.status(201).json(participant);
  } catch (err) {
    next(err);
  }
});

router.post('/sessions/join-by-code', authMiddleware, requireVerifiedUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const participant = await SessionsService.joinByCode(req.user!.id, req.body.joinCode);
    res.status(201).json(participant);
  } catch (err) {
    next(err);
  }
});

// Host Admin: Remove Participant
router.post('/sessions/:id/remove-participant', authMiddleware, requireVerifiedUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await SessionsService.removeParticipant(req.user!.id, req.params.id, req.body.participantUserId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Host Admin: Cancel Event (only if not started)
router.post('/sessions/:id/cancel', authMiddleware, requireVerifiedUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await SessionsService.cancelSession(req.user!.id, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/sessions/:id/announce', authMiddleware, requireVerifiedUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await SessionsService.announceSession(req.user!.id, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/sessions/:id/confirm-attendance', authMiddleware, requireVerifiedUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await SessionsService.confirmAttendance(
      req.user!.id,
      req.params.id,
      req.body.targetUserId,
      req.body.confirmedBy
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/sessions/:id/complete', authMiddleware, requireVerifiedUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await SessionsService.completeSession(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/sessions/:id/rate', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rating, feedback, isAnonymous } = req.body;
    const rated = await SessionsService.rateSession(
      req.user!.id,
      req.params.id,
      Number(rating),
      feedback,
      isAnonymous !== undefined ? Boolean(isAnonymous) : true
    );
    res.json(rated);
  } catch (err) {
    next(err);
  }
});

// ================= CREDITS & WALLET =================
router.get('/credits/balance', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const balance = await CreditsService.getBalance(req.user!.id);
    res.json({ balance });
  } catch (err) {
    next(err);
  }
});

router.get('/credits/ledger', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const ledger = await CreditsService.getLedgerHistory(req.user!.id, limit, offset);
    res.json(ledger);
  } catch (err) {
    next(err);
  }
});

// ================= MARKETPLACE =================
router.get('/marketplace/materials', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const materials = await MarketplaceService.listMaterials(req.user?.id);
    res.json(materials);
  } catch (err) {
    next(err);
  }
});

router.post('/marketplace/materials', authMiddleware, requireVerifiedUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, fileUrl, priceCredits, type } = req.body;
    const created = await MarketplaceService.createMaterial(req.user!.id, {
      title,
      fileUrl,
      priceCredits: Number(priceCredits),
      type,
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.post('/marketplace/materials/:id/purchase', authMiddleware, requireVerifiedUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const purchase = await MarketplaceService.purchaseMaterial(req.user!.id, req.params.id);
    res.status(201).json(purchase);
  } catch (err) {
    next(err);
  }
});

// ================= BLOG =================
router.get('/blog/posts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const posts = await BlogService.listPosts(req.user?.id);
    res.json(posts);
  } catch (err) {
    next(err);
  }
});

router.post('/blog/posts', authMiddleware, requireVerifiedUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await BlogService.createPost(req.user!.id, req.body);
    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
});

router.post('/blog/unlock', authMiddleware, requireVerifiedUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await BlogService.unlockBlogging(req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/blog/posts/:id/upvote', authMiddleware, requireVerifiedUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await BlogService.upvotePost(req.user!.id, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/blog/posts/:id/comment', authMiddleware, requireVerifiedUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comment = await BlogService.commentPost(req.user!.id, req.params.id, req.body.commentText);
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});

// ================= CUSTOMIZATIONS =================
router.get('/customizations/catalog', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const catalog = await CustomizationsService.getCatalog(req.user!.id);
    res.json(catalog);
  } catch (err) {
    next(err);
  }
});

router.post('/customizations/:id/unlock', authMiddleware, requireVerifiedUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const unlocked = await CustomizationsService.unlock(req.user!.id, req.params.id);
    res.json(unlocked);
  } catch (err) {
    next(err);
  }
});

router.patch('/customizations/:id/activate', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activated = await CustomizationsService.activate(req.user!.id, req.params.id);
    res.json(activated);
  } catch (err) {
    next(err);
  }
});

// ================= NOTIFICATIONS (ACHIEVEMENT QUEUE) =================
router.get('/notifications', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await NotificationsService.getUnseen(req.user!.id);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

router.post('/notifications/:id/ack', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const acked = await NotificationsService.ack(req.user!.id, req.params.id);
    res.json(acked);
  } catch (err) {
    next(err);
  }
});

// ================= BADGES & ANALYTICS & BANNERS =================
router.get('/badges/me', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await BadgesService.evaluateAndAwardBadges(req.user!.id);
    const user = await UsersService.getMe(req.user!.id);
    res.json(user.badges);
  } catch (err) {
    next(err);
  }
});

router.get('/analytics/skill-demand', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reports = await AnalyticsService.getSkillDemandAnalytics();
    res.json(reports);
  } catch (err) {
    next(err);
  }
});

router.post('/banners/generate', authMiddleware, requireVerifiedUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const banner = await BannersService.generateSocialBanner(
      req.user!.id,
      req.body.sourceType,
      req.body.sourceId
    );
    res.status(201).json(banner);
  } catch (err) {
    next(err);
  }
});
