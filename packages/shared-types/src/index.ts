// Shared Types and Enums for Campus Skill Exchange Platform

export enum VerificationMethod {
  EMAIL = 'email',
  MANUAL_ID = 'manual_id'
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  LAPSED = 'lapsed',
  REJECTED = 'rejected'
}

export enum UserStatus {
  ACTIVE = 'active',
  LAPSED_UNVERIFIED = 'lapsed_unverified',
  SUSPENDED = 'suspended'
}

export enum SocialPlatform {
  INSTAGRAM = 'instagram',
  X = 'x',
  LINKEDIN = 'linkedin',
  GITHUB = 'github',
  YOUTUBE = 'youtube',
  PERSONAL_SITE = 'personal_site',
  OTHER = 'other'
}

export enum CustomizationCategory {
  THEME = 'theme',
  BANNER = 'banner',
  BADGE_FRAME = 'badge_frame',
  LAYOUT = 'layout',
  FONT = 'font'
}

export enum CustomizationUnlockType {
  CREDITS = 'credits',
  SESSIONS = 'sessions'
}

export enum CustomizationTier {
  BASIC = 'basic',
  ADVANCED = 'advanced'
}

export enum NotificationType {
  BADGE_UNLOCKED = 'badge_unlocked',
  SIGNUP_BONUS = 'signup_bonus',
  SESSION_MILESTONE = 'session_milestone',
  CUSTOMIZATION_UNLOCKED = 'customization_unlocked'
}

export enum SkillType {
  TEACH = 'teach',
  LEARN = 'learn'
}

export enum SkillProficiency {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

export enum SessionType {
  ONE_TO_ONE = 'one_to_one',
  GROUP = 'group',
  MULTI_MENTOR = 'multi_mentor'
}

export type SessionDurationHours = 1 | 1.5 | 2 | 2.5 | 3;

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show'
}

export enum LocationMode {
  ONLINE = 'online',
  OFFLINE = 'offline',
  HYBRID = 'hybrid'
}

export enum ParticipantRole {
  LEARNER = 'learner',
  MENTOR = 'mentor'
}

export enum ConfirmedBy {
  SELF = 'self',
  HOST = 'host',
  MENTOR = 'mentor'
}

export enum LedgerTransactionType {
  SIGNUP_BONUS = 'signup_bonus',
  SESSION_EARNING = 'session_earning',
  SESSION_HOST_COST = 'session_host_cost',
  MENTOR_HOST_COST = 'mentor_host_cost',
  ANNOUNCEMENT_COST = 'announcement_cost',
  MONTHLY_REFILL = 'monthly_refill',
  MARKETPLACE_SALE = 'marketplace_sale',
  MARKETPLACE_PURCHASE = 'marketplace_purchase',
  BLOG_UNLOCK_COST = 'blog_unlock_cost',
  PROFILE_CUSTOMIZATION_COST = 'profile_customization_cost',
  VERIFICATION_DISSOLUTION = 'verification_dissolution'
}

export enum BadgeCriteriaType {
  HOURS = 'hours',
  RATING = 'rating'
}

export enum MaterialType {
  PDF = 'pdf',
  PPT = 'ppt'
}

export enum BlogPostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published'
}

export enum BlogInteractionType {
  UPVOTE = 'upvote',
  COMMENT = 'comment'
}

export enum BannerSourceType {
  SESSION = 'session',
  BADGE = 'badge',
  ACHIEVEMENT = 'achievement'
}

// Data Transfer Interfaces
export interface UserProfileDto {
  id: string;
  email: string;
  name: string;
  username?: string | null;
  studentId?: string | null;
  verificationMethod: VerificationMethod;
  verificationStatus: VerificationStatus;
  verifiedAt?: string | null;
  verificationExpiresAt?: string | null;
  freeAnnouncementsUsed: number;
  status: UserStatus;
  bio?: string | null;
  avatarUrl?: string | null;
  videoUrl?: string | null;
  unlockedBloggingAt?: string | null;
  creditBalance: number;
  totalSessionHours: number;
  sessionsTaughtCount: number;
  course?: string | null;
  department?: string | null;
  enrollmentYear?: number | null;
  yearsOfStudy?: number | null;
  currentYear?: number | null;
  teachSkills?: string[];
  learnSkills?: string[];
  socialLinks: UserSocialLinkDto[];
  activeCustomizations: Record<CustomizationCategory, string | null>;
  badges: UserBadgeDto[];
}

export interface UserSocialLinkDto {
  id: string;
  platform: SocialPlatform;
  url: string;
  label?: string | null;
  displayOrder: number;
}

export interface CustomizationOptionDto {
  id: string;
  key: string;
  label: string;
  category: CustomizationCategory;
  tier: CustomizationTier;
  unlockType: CustomizationUnlockType;
  unlockValue: number;
  isUnlocked: boolean;
  isActive: boolean;
  progressValue: number;
}

export interface NotificationDto {
  id: string;
  type: NotificationType;
  referenceType?: string | null;
  referenceId?: string | null;
  title: string;
  body: string;
  seen: boolean;
  createdAt: string;
}

export interface SessionPreviewRequest {
  sessionType: SessionType;
  durationHours: SessionDurationHours;
  mentorCount?: number;
  expectedLearners?: number;
}

export interface SessionPreviewResponse {
  sessionType: SessionType;
  durationHours: number;
  hostCost: number; // For 1:1 or Group (1 credit) or Multi-mentor (1.5 credits per mentor)
  learnerCostPerPerson: number; // 1 * duration_hours
  projectedEarnings: number; // Host earning formula
  netHostResult: number; // Projected - hostCost
  minParticipants: number;
  canAfford: boolean;
  notes: string[];
}

export interface BadgeDto {
  id: string;
  name: string;
  criteriaType: BadgeCriteriaType;
  threshold: number;
}

export interface UserBadgeDto {
  id: string;
  badgeId: string;
  name: string;
  criteriaType: BadgeCriteriaType;
  threshold: number;
  earnedAt: string;
}

export interface CreditLedgerDto {
  id: string;
  amount: number;
  balanceAfter: number;
  type: LedgerTransactionType;
  humanReadableReason: string;
  referenceType?: string | null;
  referenceId?: string | null;
  createdAt: string;
}

export interface SessionParticipantDto {
  id: string;
  userId: string;
  name: string;
  username?: string | null;
  email?: string;
  avatarUrl?: string | null;
  role: ParticipantRole;
  attendanceConfirmed: boolean;
  confirmedBy?: ConfirmedBy | null;
  rating?: number | null;
  feedbackText?: string | null;
  isAnonymous?: boolean;
}

export interface SessionDto {
  id: string;
  hostId: string | null;
  hostName?: string;
  hostUsername?: string | null;
  hostAvatar?: string | null;
  title?: string | null;
  description?: string | null;
  skillsTags?: string[];
  targetLearnerName?: string | null;
  sessionType: SessionType;
  skillId: string;
  skillName: string;
  durationHours: number;
  status: SessionStatus;
  scheduledAt: string;
  locationMode: LocationMode;
  meetingLink?: string | null;
  locationAddress?: string | null;
  minParticipants: number;
  maxParticipants: number;
  isPrivate: boolean;
  joinCode?: string | null;
  announcedPublicly: boolean;
  participantsCount: number;
  confirmedAttendanceCount: number;
  mentors?: { mentorId: string; name: string; username?: string | null; avatarUrl?: string | null; status?: string }[];
  participants?: SessionParticipantDto[];
  isHost?: boolean;
  hasJoined?: boolean;
  myAttendanceConfirmed?: boolean;
  hasRated?: boolean;
  isMentorInvited?: boolean;
  mentorInviteStatus?: string | null;
  isOneToOnePending?: boolean;
  learnerAccepted?: boolean;
}

export interface MaterialDto {
  id: string;
  sellerId: string;
  sellerName: string;
  title: string;
  fileUrl: string;
  priceCredits: number;
  type: MaterialType;
  createdAt: string;
  hasPurchased?: boolean;
}

export interface BlogPostDto {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername?: string | null;
  authorAvatar?: string | null;
  title: string;
  content: string;
  mediaUrls: string[];
  status: BlogPostStatus;
  publishedAt?: string | null;
  upvotesCount: number;
  hasUpvoted?: boolean;
  commentsCount: number;
}
