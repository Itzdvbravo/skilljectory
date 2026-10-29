# Campus Skill Exchange Platform — Build Specification

**Purpose of this document**: This is a complete build prompt for a coding agent. Implement the system described below as a monorepo with a React Native frontend and a Node.js/PostgreSQL backend. Read the entire document before writing code — the credit economy section (Section 5) governs correctness-critical logic that touches nearly every other feature.

---

## 1. Product Overview

A campus-restricted platform where verified students exchange skills using a time-credit system instead of money. Students teach sessions (1:1, group, or multi-mentor) to earn credits, spend credits to join sessions, and build a verifiable portfolio of teaching/learning activity that exports as a resume-ready showcase page. The platform also surfaces which skills are rare vs. oversupplied on campus via an analytics report.

Core design principle: every credit-earning mechanism must be resistant to collusion/fraud (fake sessions, fake attendees), and every feature should be traceable to one of: (a) building trust/verification, (b) keeping the credit economy balanced, or (c) giving students a durable, exportable record of their activity.

---

## 2. Tech Stack

**Frontend**: React Native (Expo managed workflow), TypeScript, React Navigation, Zustand or Redux Toolkit for state, React Query (TanStack Query) for server state/caching.

**Backend**: Node.js + TypeScript, Express or NestJS (NestJS preferred for module boundaries given the domain complexity), Prisma ORM.

**Database**: PostgreSQL 15+.

**Auth**: JWT access + refresh tokens. Email verification via signed one-time tokens. Manual ID verification is an admin-reviewed queue (file upload + manual approval), used as a fallback when automated `.edu`-style email verification isn't available.

**Background jobs**: A job runner (BullMQ + Redis, or `node-cron` if the team wants to avoid adding Redis) for: monthly credit refill, annual reverification sweep, skill demand report generation.

**File storage**: S3-compatible object storage for videos, profile media, sellable materials (PDF/PPT), and blog images/gifs.

**Image/banner generation**: Server-side templated image generation (e.g., `sharp` compositing over pre-built templates) for the auto-generated social banners — do not call an external paid image-gen API unless explicitly told to.

---

## 3. Monorepo Folder Structure

```
/skill-exchange
  /apps
    /mobile                         # React Native app
      /src
        /screens
          /auth                     # Login, signup, email verify, ID verify upload
          /onboarding               # Skill tagging, profile setup
          /discover                 # Mentor/skill search
          /sessions                 # Create/join/manage sessions (1:1, group, multi-mentor)
          /wallet                   # Credit balance, ledger history, refill status
          /marketplace              # Buy/sell materials
          /blog                     # Blog feed, post detail, composer
          /profile                  # Own profile, customization, badges
          /showcase                 # Public-facing resume/portfolio export view
          /settings                 # Reverification, account status
        /components
          /common                  # Buttons, inputs, cards, modals
          /session                 # SessionCard, ParticipantList, CreditBreakdown, LocationPicker
          /wallet                  # LedgerRow, BalancePill
          /badges                  # BadgeGrid, BadgeDetailModal
          /profile                 # SocialLinksEditor, CustomizationGrid, CustomizationLockTooltip
          /achievements            # AchievementToast, AchievementQueueProvider
        /navigation                # Stack/tab navigators
        /services                  # API client modules (one per backend domain, mirrors backend routes)
        /store                     # Zustand/Redux slices (auth, wallet, session)
        /hooks                     # useCredits, useSessionEligibility, useVerificationStatus, useAchievementQueue, useCustomizationCatalog
        /types                     # Shared TS types (mirrors backend DTOs)
        /utils                     # formatters, credit math helpers (display-only, never source of truth)
        /constants                 # Session durations, badge thresholds, pricing bounds
      app.json
      package.json

  /services
    /api                            # Backend service
      /src
        /modules
          /auth                     # signup, login, email verify, ID verify review
          /verification             # annual reverification sweep logic
          /users                    # profile, customization
          /skills                   # tagging/normalization
          /sessions                 # 1:1, group, multi-mentor session lifecycle
          /credits                  # THE LEDGER — all credit mutation logic lives here, nowhere else
          /badges                   # badge evaluation + unlock logic
          /marketplace              # material listings, purchases
          /blog                     # posts, interactions (upvote/comment)
          /showcase                 # public portfolio export (JSON + PDF render)
          /banners                  # social banner generation
          /analytics                # skill demand/rarity report generation
        /jobs
          monthlyRefill.job.ts
          annualReverification.job.ts
          demandReport.job.ts
        /middleware
          auth.middleware.ts
          verification.middleware.ts   # blocks hosting/joining if student status lapsed
          rateLimit.middleware.ts
        /db
          /prisma
            schema.prisma
            /migrations
          /seed
            seed.ts
        /common
          /errors
          /validation                  # zod/class-validator schemas per module
          /logger
        main.ts
      package.json

  /packages
    /shared-types                      # TS types/interfaces shared between mobile and api (optional but recommended)

  docker-compose.yml                   # postgres + redis for local dev
  .env.example
  README.md
```

Rule for the agent: **no module outside `/modules/credits` may write to the `credit_ledger` table directly.** Every other module calls an exported function from the credits module (e.g., `creditsService.applyTransaction(...)`) inside a database transaction. This is the single most important architectural constraint in this spec — violating it is how credit systems silently go wrong.

---

## 4. Database Schema (PostgreSQL via Prisma)

Write this as a `schema.prisma` file. Key tables below (not exhaustive DDL — the agent should fill in standard fields like `createdAt`/`updatedAt` on every table).

### users
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| email | string unique | |
| password_hash | string | |
| name | string | |
| student_id | string unique nullable | |
| verification_method | enum(email, manual_id) | |
| verification_status | enum(pending, verified, lapsed, rejected) | |
| verified_at | timestamp nullable | |
| verification_expires_at | timestamp nullable | set to `verified_at + 1 year` on approval |
| signup_bonus_claimed | boolean default false | |
| free_announcements_used | int default 0 | resets on successful reverification — see Section 5.4 |
| free_announcement_window_start | timestamp nullable | |
| status | enum(active, lapsed_unverified, suspended) | |

### profiles
`user_id` FK, `bio`, `video_url`, `avatar_url`, `resume_export_prefs_json`. (Social links and customization are modeled as separate relational tables below, not as a JSON blob here, so unlock eligibility and active state can be validated and queried server-side.)

### user_social_links
`id`, `user_id` FK, `platform` enum(instagram, x, linkedin, github, youtube, personal_site, other), `url` (validated server-side against a per-platform URL pattern — reject anything that doesn't match the expected domain for that platform, to stop someone slotting a phishing link into the Instagram field), `label` string nullable (used when `platform = other`), `display_order` int. Unique constraint on `(user_id, platform)`.

### customization_options
Catalog of everything a student can apply to their profile/showcase. This is config data — seed it at migration time, do not expose a create endpoint for it.

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| key | string unique | e.g. `profile_theme_sunrise` |
| label | string | shown in UI |
| category | enum(theme, banner, badge_frame, layout, font) | only one option per category can be `active` per user at a time |
| unlock_type | enum(credits, sessions) | |
| unlock_value | decimal | credit cost if `unlock_type = credits`; count of completed hosted sessions if `unlock_type = sessions` |
| tier | enum(basic, advanced) | basic = credit-gated, advanced = session-gated — see Section 8.2 for the seed list and exact values |

### user_customizations
`id`, `user_id` FK, `customization_option_id` FK, `unlocked_at` timestamp, `active` boolean default false. Unlocking a `credits`-type option must go through the standard credits module debit (Section 5's rule still applies: only the credits module writes to `credit_ledger`) — this table only records that the unlock happened, it never itself holds a credit amount.

### notifications
Drives the achievement-popup system in Section 8.4.

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| type | enum(badge_unlocked, signup_bonus, session_milestone, customization_unlocked) | |
| reference_type | string nullable | e.g. 'badge', 'ledger_entry' |
| reference_id | uuid nullable | |
| title | string | e.g. "Achievement unlocked" |
| body | string | e.g. "Mentor level 2 — 25 teaching hours" |
| seen | boolean default false | |
| created_at | timestamp | |

Every code path that grants a badge, the signup bonus, or hits a session-count milestone must insert a `notifications` row **in the same transaction** as the underlying change. The frontend popup system is driven entirely by unseen rows here — never by the client inferring "something changed" from diffing other endpoints' responses.

### skills
`id`, `name_normalized` (lowercase, trimmed, unique), `display_name`, `category`.

### user_skills
`id`, `user_id` FK, `skill_id` FK, `type` enum(teach, learn), `proficiency` enum(beginner, intermediate, advanced). Unique constraint on `(user_id, skill_id, type)`.

### sessions
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| host_id | uuid FK → users | nullable for multi-mentor (see session_mentors instead) |
| session_type | enum(one_to_one, group, multi_mentor) | |
| skill_id | uuid FK | |
| duration_hours | decimal | must be one of: 1, 1.5, 2, 2.5, 3 — enforce via check constraint or app-level enum |
| status | enum(scheduled, in_progress, completed, cancelled, no_show) | |
| scheduled_at | timestamp | |
| location_mode | enum(online, offline, hybrid) | required at creation |
| meeting_link | string nullable | required if `location_mode` is `online` or `hybrid`; validate as a well-formed URL |
| location_address | string nullable | required if `location_mode` is `offline` or `hybrid`; free text for v1, structured lat/lng can be added later without a breaking change |
| min_participants | int | 2 for group/multi-mentor sessions |
| announced_publicly | boolean default false | |
| announcement_was_free | boolean nullable | |
| created_at | timestamp | |

Enforce the conditional `meeting_link`/`location_address` requirement at the service layer, not just via DB nullability — reject session creation with a clear validation error if the required field for the chosen `location_mode` is missing, rather than silently allowing a location-less "offline" session.

### session_mentors
`session_id` FK, `mentor_id` FK, `credit_cost` decimal (1.5 per mentor), `credit_earned` decimal nullable (filled on completion). Composite PK `(session_id, mentor_id)`.

### session_participants
`session_id` FK, `user_id` FK, `role` enum(learner, mentor), `attendance_confirmed` boolean default false, `confirmed_by` enum(self, host, mentor) nullable, `rating` int nullable (1–5, anonymous — do not store rater identity alongside the rating in a way that's queryable back to the session's visible participant list), `feedback_text` text nullable.

**Attendance verification is mandatory before any credit payout** — see Section 5.6. Do not allow `credit_earned` to be finalized on a session until participant attendance is confirmed.

### credit_ledger (append-only, never updated or deleted)
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| amount | decimal | positive = credit, negative = debit |
| balance_after | decimal | computed and stored at write time for fast reads |
| type | enum | see full list in Section 5.1 |
| reference_type | string nullable | e.g. 'session', 'material', 'announcement' |
| reference_id | uuid nullable | |
| created_at | timestamp | |

A user's current balance is `SUM(amount)` or the `balance_after` of their most recent row — pick one as the source of truth and reconcile nightly if you cache it on the `users` table for performance. If you add a denormalized `credit_balance` column on `users` for read performance, it must only ever be updated inside the same DB transaction as the ledger insert.

### badges / user_badges
`badges`: `id`, `name`, `criteria_type` enum(hours, rating), `threshold`.
`user_badges`: `user_id`, `badge_id`, `earned_at`. Unique `(user_id, badge_id)`.

### materials / material_purchases
`materials`: `id`, `seller_id`, `title`, `file_url`, `price_credits` (1–5, check constraint), `type` enum(pdf, ppt), `created_at`.
`material_purchases`: `id`, `buyer_id`, `material_id`, `credits_paid`, `purchased_at`.

### blog_posts / blog_interactions
`blog_posts`: `id`, `author_id`, `title`, `content`, `media_urls` (text[]), `status` enum(draft, published), `published_at`.
`blog_interactions`: `id`, `blog_id`, `user_id`, `type` enum(upvote, comment), `comment_text` nullable, `created_at`. Enforce at the service layer: only users with `verification_status = 'verified'` may write to this table.

### social_banners
`id`, `user_id`, `source_type` enum(session, badge, achievement), `source_id`, `image_url`, `generated_at`.

### skill_demand_reports
`id`, `skill_id`, `period_start`, `period_end`, `demand_score` decimal, `rarity_score` decimal, `sample_size` int, `generated_at`. This table is written only by the `demandReport` job, never by user-facing endpoints.

---

## 5. Credit Economy — Exact Business Rules

**This section is the specification of record. If any other section conflicts with this one, this section wins.**

### 5.1 Ledger transaction types
`signup_bonus`, `session_earning`, `session_host_cost`, `mentor_host_cost`, `announcement_cost`, `monthly_refill`, `marketplace_sale`, `marketplace_purchase`, `blog_unlock_cost`, `profile_customization_cost`, `verification_dissolution`.

### 5.2 Sign-up bonus
On successful first verification (email or manual ID approval), credit the user once. Amount is a configurable constant (`SIGNUP_BONUS_CREDITS`, default suggestion: 3) — expose this in a config file, not hardcoded inline. Guard with `signup_bonus_claimed` to make this idempotent even if the verification webhook/approval fires twice.

### 5.3 Multi-person group sessions
- Minimum 2 participants (learners), enforced at session creation and again at the attendance-confirmation step (a session that drops to 1 confirmed attendee does not pay out — see 5.6).
- Duration must be one of the fixed tiers (1, 1.5, 2, 2.5, 3 hours).
- Host pays `1` credit to open the session (debited at creation, non-refundable even if the session is later cancelled by the host — this is the anti-spam cost).
- On completion, host earns `max(3, confirmed_participants × duration_hours)`.
- Net host result = earning − 1 (hosting fee). Compute and log this as two separate ledger rows (`session_host_cost` at creation, `session_earning` at completion) — do not net them into one row, since the fee is charged regardless of outcome and the earning is conditional on completion.
- Attendees are each debited `1 × duration_hours` credits at the point they confirm attendance (not at signup — see 5.6 for why).

### 5.4 Public announcement of a session
- Costs 1 credit per use beyond the free allowance.
- Each user gets 4 free uses, gated by a cooldown: each free use must be at least 4 days after the previous free use (track via `free_announcement_window_start`/timestamps — reject a free announcement attempt inside the cooldown and charge the paid credit instead, don't silently fail).
- **Open design question, flagged for confirmation, default behavior to implement**: the spec doesn't state when the "4 free uses" counter resets. Default implementation: reset `free_announcements_used` to 0 whenever `verification_status` transitions to `verified` via the annual reverification flow (Section 5.9), so the free allowance renews yearly in step with reverification. Leave a clear `// TODO: confirm reset policy with product owner` comment at this logic site so it's easy to change later.

### 5.5 Multi-mentor sessions
- Requires 2+ mentors. `learners ≥ mentors` is a hard constraint, enforced at session creation and re-checked at attendance confirmation (if learners drop below mentor count after no-shows, do not pay out — fall back to the no-payout path in 5.6).
- Each mentor pays `1.5` credits to co-host (debited at creation, same non-refundable rule as 5.3).
- Total pool = `confirmed_learners × duration_hours`. **No floor applies to this pool** — the floor exists only for the single-host group session formula in 5.3; applying it here is what made the 1-mentor/1-learner case profitable in earlier drafts, which is exactly the abuse this feature exists to prevent. Do not reintroduce a floor here.
- Each mentor earns `pool / number_of_mentors`.
- This path is only reachable if `mentors ≥ 2`; a single mentor can never use this transaction type (route them to the 5.3 flow instead, which has its own, separate fee).

### 5.6 Attendance verification gate (applies to 5.3 and 5.5)
No `session_earning` ledger row may be written until attendance is confirmed. Confirmation requires each learner to confirm their own attendance within a fixed post-session window (e.g., 48 hours) via the app, OR the host/mentor marks them present and no learner disputes it within that window. If confirmed attendance drops the session below its minimum participant requirement (2 for group, `learners ≥ mentors` for multi-mentor), the session is marked `no_show` and:
- The host/mentor hosting fee is **not refunded** (it already served its anti-spam purpose).
- No `session_earning` row is written for anyone.
- No learner debits are finalized for unconfirmed learners.

### 5.7 Monthly credit refill
- Target population: users who have **consumed 3+ sessions as a learner** (lifetime or trailing-window — implement as trailing 3 months for relevance, configurable) **and** whose taught skill(s) show low demand per the latest `skill_demand_reports` entry (define "low demand" as bottom quartile `demand_score` for skills the user has tagged as `type = teach`; a user with no taught skills tagged at all also qualifies, since they structurally cannot earn).
- Grant: `2` credits, once per calendar month, via the `monthlyRefill` job. Idempotency: check for an existing `monthly_refill` ledger row for that user in the current month before writing a new one.

### 5.8 Marketplace and blog unlock costs
- Material listings: seller sets a price in the `1–5` credit range (enforce as a DB check constraint, not just frontend validation). Purchase is a single atomic transaction: debit buyer, credit seller, both rows reference the same `material_purchases.id`.
- Blog unlock: requires **both** `total_session_hours ≥ 15` **and** `current_credit_balance ≥ 10` at the moment of unlock. This is a one-time gate check, not a recurring cost — once unlocked, do not re-charge the user on subsequent posts. Store an `unlocked_blogging_at` timestamp on the user or profile table rather than re-evaluating the threshold on every post (so a later credit spend doesn't retroactively lock them out).

### 5.9 Annual reverification and credit dissolution
- `verification_expires_at` is set one year from the last successful verification.
- The `annualReverification` job runs daily, finds users past their expiry with no renewed verification, and:
  1. Sets `verification_status = 'lapsed'`, `status = 'lapsed_unverified'`.
  2. Writes a `verification_dissolution` ledger row that zeroes the balance (amount = `-current_balance`, `balance_after = 0`). This preserves the audit trail — never delete ledger history.
  3. Does **not** touch: `user_badges`, `blog_posts`, `materials` already listed (existing listings can stay visible but new listings are blocked), `profile` content, showcase/portfolio data. These remain fully intact and visible.
  4. Blocks, via `verification.middleware.ts`: creating/hosting any session type, joining any session as a learner or mentor, purchasing marketplace materials, posting new blog content, publishing new social banners. A lapsed user can still view their own dashboard, export their showcase, and re-submit verification to reactivate.
- On successful reverification, do not restore the dissolved balance — it's gone. Do reset `free_announcements_used` per 5.4.

---

## 6. Backend API Endpoints (representative, not exhaustive)

```
POST   /auth/signup
POST   /auth/login
POST   /auth/verify-email
POST   /auth/verify-id            # uploads doc, creates admin review item
POST   /auth/reverify             # annual renewal flow

GET    /users/me
PATCH  /users/me/profile
GET    /users/:id/showcase         # public portfolio view

POST   /skills/tag                 # normalizes + creates/links skill tags
GET    /skills/search?q=

GET    /sessions/search?skill=&mentor=
POST   /sessions                   # create 1:1, group, or multi-mentor (type in body)
POST   /sessions/:id/join
POST   /sessions/:id/announce
POST   /sessions/:id/confirm-attendance
POST   /sessions/:id/complete      # triggers credit settlement per Section 5
POST   /sessions/:id/rate          # anonymous 1-5 + feedback

GET    /credits/balance
GET    /credits/ledger             # paginated history

GET    /marketplace/materials
POST   /marketplace/materials
POST   /marketplace/materials/:id/purchase

GET    /blog/posts
POST   /blog/posts                 # 403 if unlock gate not met
POST   /blog/posts/:id/upvote      # 403 if not verified
POST   /blog/posts/:id/comment

GET    /badges/me
GET    /analytics/skill-demand     # read-only, for discover/search ranking

POST   /users/me/social-links
DELETE /users/me/social-links/:id

GET    /customizations/catalog     # full catalog with each item's lock state + progress for the current user
POST   /customizations/:id/unlock  # 403 if requirements unmet; debits credits via the credits module if unlock_type=credits
PATCH  /customizations/:id/activate

GET    /notifications?unseen=true
POST   /notifications/:id/ack      # marks seen=true once the popup has been shown client-side
```

---

## 7. Background Jobs

| Job | Schedule | Responsibility |
|---|---|---|
| `monthlyRefill.job.ts` | 1st of month, 00:00 campus-local time | Section 5.7 |
| `annualReverification.job.ts` | Daily | Section 5.9 |
| `demandReport.job.ts` | Weekly | Aggregates completed sessions + user_skills to compute `demand_score`/`rarity_score` per skill; writes to `skill_demand_reports` |

All jobs must be idempotent and safe to re-run (check for existing rows for the relevant period before writing).

---

## 8. Frontend Notes

### 8.1 Wallet and session preview
- The wallet screen must show, for every ledger row, a human-readable reason (join `type` + `reference_type` to a display string — don't show raw enum values).
- Session creation flow must branch by type (1:1 / group / multi-mentor) early and show the relevant cost/earning preview **before** the user confirms — compute this preview by calling a backend `POST /sessions/preview` endpoint rather than re-implementing the formulas in the frontend, so the math is never duplicated or allowed to drift from Section 5.

### 8.2 Profile: social links and customization
- **Social links**: on the profile edit screen, show a fixed row of recognizable platform icons (Instagram, X, LinkedIn, GitHub, YouTube, personal site, other). Tapping an icon not yet linked opens a single-field input for that platform's URL; tapping a linked one lets the user edit or remove it. Unlinked platforms show in a muted/outline state so the row communicates "what's missing" at a glance. Validate the URL client-side for immediate feedback, but treat server-side validation (Section 4) as the real gate.
- **Customization catalog seed list** (implement exactly these for v1 — the agent should not invent additional paid tiers beyond what's listed here):

  | key | category | tier | unlock_type | unlock_value |
  |---|---|---|---|---|
  | `profile_theme_sunrise` | theme | basic | credits | 1 |
  | `profile_theme_midnight` | theme | basic | credits | 1 |
  | `banner_style_minimal` | banner | basic | credits | 2 |
  | `badge_frame_bronze` | badge_frame | basic | credits | 2 |
  | `profile_theme_aurora` | theme | advanced | sessions | 3 |
  | `layout_featured_materials` | layout | advanced | sessions | 3 |
  | `banner_style_dynamic_stats` | banner | advanced | sessions | 4 |
  | `badge_frame_gold` | badge_frame | advanced | sessions | 5 |

  "Sessions" here means **completed sessions hosted as teacher/mentor**, not attended as a learner — this keeps the unlock incentive aligned with the rest of the economy, which rewards teaching, not consumption. State this plainly in the UI copy (e.g., "3 sessions taught") so it's never ambiguous to the student.

- **Lock state and unlock-requirement preview**: every customization option renders as a tile. Locked tiles are visually dimmed with a lock icon overlay. On tap (mobile has no hover — use tap-to-preview, not a hover state) a locked tile opens a small bottom-sheet/popover showing:
  - For `credits`-gated items: "Unlock for 2 credits" plus the user's current balance, and an "Unlock now" button if they can afford it (disabled, with the shortfall shown, if they can't).
  - For `sessions`-gated items: "Unlock after 3 sessions taught" plus a progress indicator against their current count (e.g., "1 of 3") and no purchase action — this tier can only be earned, never bought outright.
  - Unlocked-but-inactive tiles show an "Apply" action instead; the currently active tile per category is visually marked (e.g., a checkmark).

### 8.3 Session hosting: location
- When creating any session type, the host picks `Online`, `Offline`, or `Hybrid` via a segmented control before duration/scheduling fields.
- `Online` reveals a single meeting-link input (validate as URL on blur).
- `Offline` reveals a location/address input (free text for v1; a map-picker component can replace this later without changing the API contract).
- `Hybrid` reveals both fields, both required.
- Joining a session shows the location info up front on the session detail screen — a learner should never have to open a separate screen to find out whether a session is in person.

### 8.4 Achievement popups (Xbox/Minecraft-style)
This is a distinct system from the wallet or badge screens — it's about the *moment* something is earned, not where it lives afterward.
- Implement a global `AchievementQueueProvider` mounted near the app root, backed by `useAchievementQueue`. On app foreground, after completing a session, and after claiming the signup bonus, the app calls `GET /notifications?unseen=true`; any rows returned are pushed into a local queue.
- The queue renders one `AchievementToast` at a time — never stack multiple simultaneous unlocks on screen at once, even if several notifications arrive together. Each toast: slides in from the top edge, shows an icon appropriate to `type` (badge icon, a coin/bonus icon for `signup_bonus`, a calendar/milestone icon for `session_milestone`), the `title` and `body` text, auto-dismisses after ~4 seconds, and can be dismissed early with a tap. The moment a toast finishes displaying, call `POST /notifications/:id/ack` and advance the queue to the next item.
- Keep the animation and sound (optional, togglable in settings) celebratory but brief — this should feel like a game achievement ping, not a modal the user has to actively close to keep using the app. Never block navigation or input while a toast is showing.
- Badge unlocks, the signup bonus, and session-count milestones all flow through this same component — do not build a separate one-off popup for the signup bonus. One system, driven entirely by the `notifications` table, keeps this consistent and means adding a new achievement type later is a backend-only change.

### 8.5 Verification and showcase
- Lapsed-verification users should see a persistent, non-dismissible banner explaining what's locked and a one-tap path to reverify, without hiding their existing profile/showcase/badges — the goal is to make the distinction between "locked" and "deleted" obvious.
- Showcase/resume export screen should render from a single backend-provided JSON shape (including social links and the currently active customization selections) so a future PDF/HTML export shares the exact same data as the in-app view.

---

## 9. Security and Anti-Abuse Requirements

- Every credit-mutating endpoint requires authentication and a valid, non-lapsed verification status (middleware-enforced, not just route-guarded in the frontend).
- Rate-limit session creation and announcement endpoints per user (e.g., max 10 session creations/day) to blunt low-effort farming attempts beyond what the formulas already discourage.
- All credit mutations happen inside a single DB transaction per operation (debit + credit + ledger writes are atomic — use Prisma's `$transaction`).
- Log every credit-ledger write with the triggering request ID for auditability.
- Validate `user_social_links.url` server-side against an allowlist pattern per platform (e.g., must match `instagram.com/...` for the `instagram` enum value) before saving — don't trust client-side validation alone, since this field is rendered as an outbound link on a public showcase page.

---

## 10. Open Design Assumptions (confirm before or during build, not blocking)

1. **Free-announcement reset cadence** tied to annual reverification (Section 5.4) — confirm or change.
2. **Signup bonus amount** — placeholder value, confirm with product owner.
3. **"Low demand" definition** for the monthly refill (bottom quartile by `demand_score`) — confirm the exact statistical cutoff.
4. **Attendance confirmation window** (48 hours) — confirm timing.
5. Whether cancelled-by-host sessions should refund the hosting fee under any circumstance (current spec: never) — confirm.

---

## 11. Suggested Build Order

1. DB schema + migrations + seed data (skills list, badge thresholds).
2. Auth + verification (email flow first, manual ID review queue second).
3. Credits module in isolation, with unit tests covering every formula in Section 5 (including the edge cases called out: 2-learner group session, 2-mentor/2-learner multi-mentor session, no-show rollback). Do not proceed past this step until these tests pass — every other module depends on this one being correct.
4. Sessions module (creation, join, attendance, completion — including location_mode handling) wired to the credits module.
5. Profile, skills, badges, social links, customization catalog + unlock logic.
6. Notifications table + the triggers that write to it (badge grant, signup bonus, session milestones) — build this alongside step 5, not after, since badges and the signup bonus are already wired by then.
7. Marketplace, blog, showcase export.
8. Banners, analytics/demand report.
9. React Native screens, wired to the above in the same order. Build the `AchievementQueueProvider` early (right after auth) even though it has nothing to show yet — retrofitting a global popup system after screens exist is more disruptive than seeding it first.
