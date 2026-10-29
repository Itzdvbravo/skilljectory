"use strict";
// Shared Types and Enums for Campus Skill Exchange Platform
Object.defineProperty(exports, "__esModule", { value: true });
exports.BannerSourceType = exports.BlogInteractionType = exports.BlogPostStatus = exports.MaterialType = exports.BadgeCriteriaType = exports.LedgerTransactionType = exports.ConfirmedBy = exports.ParticipantRole = exports.LocationMode = exports.SessionStatus = exports.SessionType = exports.SkillProficiency = exports.SkillType = exports.NotificationType = exports.CustomizationTier = exports.CustomizationUnlockType = exports.CustomizationCategory = exports.SocialPlatform = exports.UserStatus = exports.VerificationStatus = exports.VerificationMethod = void 0;
var VerificationMethod;
(function (VerificationMethod) {
    VerificationMethod["EMAIL"] = "email";
    VerificationMethod["MANUAL_ID"] = "manual_id";
})(VerificationMethod || (exports.VerificationMethod = VerificationMethod = {}));
var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["PENDING"] = "pending";
    VerificationStatus["VERIFIED"] = "verified";
    VerificationStatus["LAPSED"] = "lapsed";
    VerificationStatus["REJECTED"] = "rejected";
})(VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "active";
    UserStatus["LAPSED_UNVERIFIED"] = "lapsed_unverified";
    UserStatus["SUSPENDED"] = "suspended";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var SocialPlatform;
(function (SocialPlatform) {
    SocialPlatform["INSTAGRAM"] = "instagram";
    SocialPlatform["X"] = "x";
    SocialPlatform["LINKEDIN"] = "linkedin";
    SocialPlatform["GITHUB"] = "github";
    SocialPlatform["YOUTUBE"] = "youtube";
    SocialPlatform["PERSONAL_SITE"] = "personal_site";
    SocialPlatform["OTHER"] = "other";
})(SocialPlatform || (exports.SocialPlatform = SocialPlatform = {}));
var CustomizationCategory;
(function (CustomizationCategory) {
    CustomizationCategory["THEME"] = "theme";
    CustomizationCategory["BANNER"] = "banner";
    CustomizationCategory["BADGE_FRAME"] = "badge_frame";
    CustomizationCategory["LAYOUT"] = "layout";
    CustomizationCategory["FONT"] = "font";
})(CustomizationCategory || (exports.CustomizationCategory = CustomizationCategory = {}));
var CustomizationUnlockType;
(function (CustomizationUnlockType) {
    CustomizationUnlockType["CREDITS"] = "credits";
    CustomizationUnlockType["SESSIONS"] = "sessions";
})(CustomizationUnlockType || (exports.CustomizationUnlockType = CustomizationUnlockType = {}));
var CustomizationTier;
(function (CustomizationTier) {
    CustomizationTier["BASIC"] = "basic";
    CustomizationTier["ADVANCED"] = "advanced";
})(CustomizationTier || (exports.CustomizationTier = CustomizationTier = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["BADGE_UNLOCKED"] = "badge_unlocked";
    NotificationType["SIGNUP_BONUS"] = "signup_bonus";
    NotificationType["SESSION_MILESTONE"] = "session_milestone";
    NotificationType["CUSTOMIZATION_UNLOCKED"] = "customization_unlocked";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var SkillType;
(function (SkillType) {
    SkillType["TEACH"] = "teach";
    SkillType["LEARN"] = "learn";
})(SkillType || (exports.SkillType = SkillType = {}));
var SkillProficiency;
(function (SkillProficiency) {
    SkillProficiency["BEGINNER"] = "beginner";
    SkillProficiency["INTERMEDIATE"] = "intermediate";
    SkillProficiency["ADVANCED"] = "advanced";
})(SkillProficiency || (exports.SkillProficiency = SkillProficiency = {}));
var SessionType;
(function (SessionType) {
    SessionType["ONE_TO_ONE"] = "one_to_one";
    SessionType["GROUP"] = "group";
    SessionType["MULTI_MENTOR"] = "multi_mentor";
})(SessionType || (exports.SessionType = SessionType = {}));
var SessionStatus;
(function (SessionStatus) {
    SessionStatus["SCHEDULED"] = "scheduled";
    SessionStatus["IN_PROGRESS"] = "in_progress";
    SessionStatus["COMPLETED"] = "completed";
    SessionStatus["CANCELLED"] = "cancelled";
    SessionStatus["NO_SHOW"] = "no_show";
})(SessionStatus || (exports.SessionStatus = SessionStatus = {}));
var LocationMode;
(function (LocationMode) {
    LocationMode["ONLINE"] = "online";
    LocationMode["OFFLINE"] = "offline";
    LocationMode["HYBRID"] = "hybrid";
})(LocationMode || (exports.LocationMode = LocationMode = {}));
var ParticipantRole;
(function (ParticipantRole) {
    ParticipantRole["LEARNER"] = "learner";
    ParticipantRole["MENTOR"] = "mentor";
})(ParticipantRole || (exports.ParticipantRole = ParticipantRole = {}));
var ConfirmedBy;
(function (ConfirmedBy) {
    ConfirmedBy["SELF"] = "self";
    ConfirmedBy["HOST"] = "host";
    ConfirmedBy["MENTOR"] = "mentor";
})(ConfirmedBy || (exports.ConfirmedBy = ConfirmedBy = {}));
var LedgerTransactionType;
(function (LedgerTransactionType) {
    LedgerTransactionType["SIGNUP_BONUS"] = "signup_bonus";
    LedgerTransactionType["SESSION_EARNING"] = "session_earning";
    LedgerTransactionType["SESSION_HOST_COST"] = "session_host_cost";
    LedgerTransactionType["MENTOR_HOST_COST"] = "mentor_host_cost";
    LedgerTransactionType["ANNOUNCEMENT_COST"] = "announcement_cost";
    LedgerTransactionType["MONTHLY_REFILL"] = "monthly_refill";
    LedgerTransactionType["MARKETPLACE_SALE"] = "marketplace_sale";
    LedgerTransactionType["MARKETPLACE_PURCHASE"] = "marketplace_purchase";
    LedgerTransactionType["BLOG_UNLOCK_COST"] = "blog_unlock_cost";
    LedgerTransactionType["PROFILE_CUSTOMIZATION_COST"] = "profile_customization_cost";
    LedgerTransactionType["VERIFICATION_DISSOLUTION"] = "verification_dissolution";
})(LedgerTransactionType || (exports.LedgerTransactionType = LedgerTransactionType = {}));
var BadgeCriteriaType;
(function (BadgeCriteriaType) {
    BadgeCriteriaType["HOURS"] = "hours";
    BadgeCriteriaType["RATING"] = "rating";
})(BadgeCriteriaType || (exports.BadgeCriteriaType = BadgeCriteriaType = {}));
var MaterialType;
(function (MaterialType) {
    MaterialType["PDF"] = "pdf";
    MaterialType["PPT"] = "ppt";
})(MaterialType || (exports.MaterialType = MaterialType = {}));
var BlogPostStatus;
(function (BlogPostStatus) {
    BlogPostStatus["DRAFT"] = "draft";
    BlogPostStatus["PUBLISHED"] = "published";
})(BlogPostStatus || (exports.BlogPostStatus = BlogPostStatus = {}));
var BlogInteractionType;
(function (BlogInteractionType) {
    BlogInteractionType["UPVOTE"] = "upvote";
    BlogInteractionType["COMMENT"] = "comment";
})(BlogInteractionType || (exports.BlogInteractionType = BlogInteractionType = {}));
var BannerSourceType;
(function (BannerSourceType) {
    BannerSourceType["SESSION"] = "session";
    BannerSourceType["BADGE"] = "badge";
    BannerSourceType["ACHIEVEMENT"] = "achievement";
})(BannerSourceType || (exports.BannerSourceType = BannerSourceType = {}));
