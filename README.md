# Campus Skill Exchange Platform

A campus-restricted platform where verified students exchange skills using a time-credit economy instead of money. Students teach sessions (1:1, group, or multi-mentor) to earn credits, spend credits to join sessions, and build a verifiable portfolio of teaching and learning activity that exports as a resume-ready showcase page.

Governed strictly by [`skill_exchange_build_spec.md`](./skill_exchange_build_spec.md).

---

## 1. Monorepo Architecture

```
/skill-exchange
  /apps
    /mobile                         # React Native (Expo managed workflow, TypeScript)
      /src
        /screens                    # Auth, Discover, Sessions, Wallet, Marketplace, Blog, Profile, Showcase, Settings
        /components
          /achievements             # Xbox/Minecraft-style AchievementToast & AchievementQueueProvider
          /common                   # LapsedBanner (persistent reverify callout)
          /session                  # LocationPicker (Online/Offline/Hybrid validation)
          /profile                  # SocialLinksEditor (allowed-domain check), CustomizationGrid (tap-to-preview popover)
        /services                   # Typed API client mirroring all backend domain routes
        /store                      # Zustand slices
  /services
    /api                            # Node.js + TypeScript Express backend
      /src
        /modules
          /credits                  # THE SOLE MODULE AUTHORIZED to write to credit_ledger
          /auth                     # JWT access/refresh, email verify, ID review, reverify renewal
          /sessions                 # Preview calculation, location validation, attendance gate, completion settlement
          /customizations           # Basic (credits-gated) and Advanced (sessions-gated) catalog logic
          /badges                   # Hour & rating thresholds, atomic notification emission
          /marketplace              # 1-5 credit range constraint, atomic buyer debit / seller credit
          /blog                     # 15hr/10cr unlock gate, verified-only interactions
          /showcase                 # Public portfolio export JSON canonical shape
          /banners                  # Templated SVG social banner generation
          /analytics                # Skill demand & rarity reports
        /jobs                       # MonthlyRefill (1st of month), AnnualReverification (daily), DemandReport (weekly)
        /middleware                 # auth.middleware, verification.middleware, rateLimit.middleware
        /db
          /prisma                   # PostgreSQL Prisma schema (17 relational models)
          /seed                     # Seed catalog (8 options), default skills, badges
  /packages
    /shared-types                   # Core DTOs, enums and interfaces shared between mobile and API
  docker-compose.yml                # Local PostgreSQL 15 & Redis services
  .env.example                      # Template environment variables
  .env                              # Local environment configuration
```

---

## 2. Credit Economy Rules Implemented (Section 5)

| Transaction / Feature | Implementation Rule | Specification Ref |
|---|---|---|
| **Ledger Isolation** | **No module outside `/modules/credits` writes to `credit_ledger`.** All credit mutations go through `CreditsService.applyTransaction()` inside a Prisma `$transaction`. | Section 3 & 5 |
| **Signup Bonus** | 3 credits credited once upon student verification; idempotent guard (`signup_bonus_claimed`); triggers Xbox-style achievement notification. | Section 5.2 |
| **Group Sessions** | Host pays 1 credit non-refundable anti-spam fee at creation. On completion, host earns `max(3, confirmed_attendees × duration_hours)`. Learners debited `1 × duration_hours` upon attendance confirmation. | Section 5.3 |
| **Public Announcements** | 4 free uses with a 4-day cooldown between free uses. Paid uses cost 1 credit. Allowance resets on annual reverification. | Section 5.4 |
| **Multi-Mentor Sessions** | Requires 2+ mentors with `learners ≥ mentors`. Mentors pay 1.5 credits co-host fee upfront. Pool = `learners × duration_hours` (**strictly NO floor**), split evenly among co-mentors. | Section 5.5 |
| **Attendance Gate & No-Show Rollback** | Payout occurs only after attendance confirmation. If attendees drop below minimum (2 for group, `learners ≥ mentors` for multi-mentor), marked `no_show`: host fee NOT refunded, 0 payout, no learner debits finalized. | Section 5.6 |
| **Monthly Refill Stimulus** | Students who consumed 3+ sessions as learner in trailing 3 months AND taught skill in bottom quartile campus demand receive 2 credits on the 1st of each month. | Section 5.7 |
| **Marketplace Constraints** | Study materials price must be between 1 and 5 credits (enforced at service and check constraint). Purchase is atomic: debits buyer, credits seller referencing purchase ID. | Section 5.8 |
| **Blog Unlock Gate** | Publishing requires `total_session_hours ≥ 15` AND `credit_balance ≥ 10`. One-time gate check that persists `unlocked_blogging_at` timestamp. | Section 5.8 |
| **Annual Reverification & Dissolution** | Daily sweep identifies expired verifications: marks `lapsed`, zeroes balance via `verification_dissolution` audit row. Keeps showcase/badges visible; blocks credit actions via `verification.middleware`. | Section 5.9 |

---

## 3. Frontend Features Implemented (Section 8)

1. **Xbox / Minecraft-Style Achievement Popups (`AchievementToast` & `AchievementQueueProvider`)**:
   - Slides down from top edge with sound/accent glow
   - Displays icon per type (`signup_bonus`, `session_milestone`, `customization_unlocked`, `badge_unlocked`)
   - Auto-dismisses after 4s or tap-to-dismiss
   - Calls `POST /notifications/:id/ack` and advances queue one by one without stacking
2. **Session Location Mode (Section 8.3)**:
   - Segmented control for `Online`, `Offline`, and `Hybrid`
   - Validates meeting link URL and/or campus address upfront
3. **Session Preview Calculation (Section 8.1)**:
   - Calls backend `POST /sessions/preview` so frontend never duplicates credit economy math
4. **Social Links Editor (Section 8.2 & Section 9)**:
   - Fixed row of recognizable platform icons (Instagram, X, LinkedIn, GitHub, YouTube, Personal site, Other)
   - Muted/outline state communicates missing accounts
   - Server-side domain regex allowlist validation
5. **Showcase Customization Catalog (Section 8.2)**:
   - Basic tier: credits-gated with shortfall indicator
   - Advanced tier: session-gated ("3 sessions taught") with progress bar; strictly non-purchasable
   - Active state indicator with single-active-per-category enforcement
6. **Lapsed State Banner (Section 8.5)**:
   - Persistent non-dismissible banner for lapsed students explaining what is locked without hiding existing portfolio data

---

## 4. Running the Project

### Running Credit Economy Unit Tests
To run the automated test suite covering all Section 5 formulas and edge cases:
```bash
npm run test:credits
```

### Running the Backend API
1. Configure your local PostgreSQL database URL in `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/campus_skill_exchange?schema=public"
   ```
2. Run database migrations and seed catalog:
   ```bash
   npm run --workspace=services/api prisma:push
   npm run --workspace=services/api seed
   ```
3. Start the dev server:
   ```bash
   npm run api:dev
   ```

### Running the React Native Mobile App
```bash
npm run mobile:start
```
Press `w` in the Expo terminal to open the web preview, or scan the QR code with Expo Go on iOS/Android.
