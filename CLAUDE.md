# Phoenix Bikes — P2P Fundraising Platform

## This Project
- **Name**: Phoenix P2P — Peer-to-Peer Fundraising
- **Repo**: github.com/Phoenix-Bikes/phoenix-p2p
- **Deploys to**: fundraise.phoenixbikes.org (Vercel)
- **Database**: Separate Supabase instance (NOT phoenix-core)
- **Tech Stack**: Next.js (App Router) + React + TypeScript + Supabase + Vercel + Stripe/PayPal + Bloomerang API + Resend

## Purpose

Replace Qgiv for P2P fundraising events like Raise and Ride. Participants create fundraising pages, join teams, collect donations, and track progress. Admin sets up campaigns, manages registrations, records offline payments, and syncs everything to Bloomerang.

## Architecture: Config-Driven Block Pages

Every public page (campaign, team, participant) is rendered from a **block config** — a JSON array that defines layout, content, and behavior. This makes pages lightweight, customizable, and fast to spin up.

Blocks are the building blocks of every page. The system provides sensible defaults per page type, but admins and participants can customize within guardrails.

---

## Data Model

### Hierarchy

```
Campaign (Raise and Ride 2026)
  ├── Teams (Arlington Riders, Youth Squad, etc.)
  │     └── Participants (team members)
  └── Participants (individuals not on a team)
        └── Donations (tracked per participant)
```

### Core Tables

#### `campaigns`
The top-level event container.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | TEXT | "Raise and Ride 2026" |
| slug | TEXT | URL slug: `raise-ride-2026` |
| status | ENUM | draft, registration, active, closed |
| campaign_goal | DECIMAL | Overall fundraising goal |
| adult_registration_fee | DECIMAL | Fee for adult participants |
| youth_registration_fee | DECIMAL | Reduced fee for youth |
| adult_min_goal | DECIMAL | Minimum fundraising goal for adults |
| youth_min_goal | DECIMAL | Minimum fundraising goal for youth |
| info_block | JSONB | Shared "why we're raising" content passed to all pages |
| email_templates | JSONB | Example email language participants can copy |
| page_config | JSONB | Default block layout for participant pages |
| team_page_config | JSONB | Default block layout for team pages |
| campaign_page_config | JSONB | Block layout for the main campaign page |
| bloomerang_campaign_id | TEXT | Bloomerang campaign for donation sync |
| bloomerang_fund_id | TEXT | Bloomerang fund for donation allocation |
| registration_start | TIMESTAMPTZ | When registration opens |
| registration_end | TIMESTAMPTZ | When registration closes |
| event_date | TIMESTAMPTZ | The actual event date |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `teams`
Optional grouping of participants.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| campaign_id | UUID | FK → campaigns |
| name | TEXT | Team display name |
| slug | TEXT | URL slug |
| captain_id | UUID | FK → participants (team creator) |
| team_goal | DECIMAL | Team fundraising goal (sum or explicit) |
| page_config | JSONB | Override block layout (inherits campaign default) |
| invite_code | TEXT | Unique code for joining this team |
| created_at | TIMESTAMPTZ | |

#### `participants`
People who registered to fundraise.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| campaign_id | UUID | FK → campaigns |
| team_id | UUID | FK → teams (nullable — solo fundraisers) |
| first_name | TEXT | |
| last_name | TEXT | |
| email | TEXT | Registration email |
| phone | TEXT | Optional |
| slug | TEXT | URL slug for their page |
| is_youth | BOOLEAN | Youth = reduced fee + different min goal |
| personal_goal | DECIMAL | Their fundraising goal (>= min) |
| personal_story | TEXT | Their "why I'm fundraising" text |
| profile_photo_url | TEXT | Optional headshot |
| page_config | JSONB | Override block layout (inherits campaign default) |
| registration_fee_paid | BOOLEAN | Whether they've paid to register |
| registration_payment_id | TEXT | PayPal/Stripe payment reference |
| registration_method | ENUM | online, cash, check, waived |
| auth_token | TEXT | Magic link token for editing their page |
| bloomerang_account_id | TEXT | Matched Bloomerang constituent |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `donations`
Every donation, online or offline.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| campaign_id | UUID | FK → campaigns |
| participant_id | UUID | FK → participants (who gets credit) |
| donor_name | TEXT | Display name |
| donor_email | TEXT | For receipt |
| amount | DECIMAL | Donation amount |
| message | TEXT | Optional public message |
| is_anonymous | BOOLEAN | Hide name on donor wall |
| payment_method | ENUM | online, cash, check, other |
| payment_id | TEXT | PayPal/Stripe reference (null for offline) |
| payment_status | ENUM | pending, completed, refunded |
| recorded_by | UUID | FK → admin_users (for offline recording) |
| bloomerang_transaction_id | TEXT | After sync |
| bloomerang_soft_credit_id | TEXT | Participant's soft credit in Bloomerang |
| receipt_sent | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

#### `team_invites`
Join requests and invitations.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| team_id | UUID | FK → teams |
| inviter_id | UUID | FK → participants (who sent it) |
| invitee_email | TEXT | Who it's for |
| invitee_name | TEXT | Optional |
| status | ENUM | pending, accepted, declined, expired |
| direction | ENUM | invite (captain→person), request (person→captain) |
| created_at | TIMESTAMPTZ | |
| responded_at | TIMESTAMPTZ | |

#### `admin_users`
Staff who manage campaigns (separate from participants).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK, linked to Supabase auth |
| email | TEXT | Google SSO email |
| name | TEXT | |
| role | ENUM | admin, staff |
| created_at | TIMESTAMPTZ | |

#### `bloomerang_sync_queue`
Same retry pattern as raffle-page.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| donation_id | UUID | FK → donations |
| status | ENUM | pending, processing, synced, failed |
| attempts | INT | |
| last_error | TEXT | |
| next_retry_at | TIMESTAMPTZ | Exponential backoff |
| created_at | TIMESTAMPTZ | |

#### `offline_payments`
Cash/check log for audit trail.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| donation_id | UUID | FK → donations |
| method | ENUM | cash, check |
| check_number | TEXT | If check |
| received_by | UUID | FK → admin_users |
| received_date | DATE | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |

---

## URL Structure

```
fundraise.phoenixbikes.org/
  └── {campaign-slug}/                     Campaign landing page
        ├── register/                       Participant registration
        ├── leaderboard/                    Full leaderboard
        ├── teams/                          All teams list
        ├── {team-slug}/                    Team page
        │     └── join/                     Join this team
        └── {participant-slug}/             Individual fundraiser page
              ├── donate/                   Donation form
              └── edit/                     Edit page (magic link auth)
```

### Admin Routes
```
fundraise.phoenixbikes.org/admin/
  ├── login                                Google SSO
  ├── campaigns/                           Campaign list
  ├── campaigns/{id}/                      Campaign dashboard
  │     ├── participants/                  Manage participants
  │     ├── teams/                         Manage teams
  │     ├── donations/                     All donations + offline recording
  │     ├── registrations/                 Registration management
  │     ├── email-templates/               Example language for participants
  │     └── bloomerang/                    Sync status + manual sync
  └── settings/                            Global settings
```

---

## Page Block System

### Block Types

| Block | Available On | Purpose |
|-------|-------------|---------|
| `hero` | All | Photo/video + headline text |
| `info-block` | Participant, Team | Inherited "why we're raising" from campaign |
| `thermometer` | All | Goal progress (amount raised / goal) |
| `personal-story` | Participant | Their personal "why" |
| `team-roster` | Team | Grid of team member cards |
| `donor-wall` | Participant, Team, Campaign | Recent donations with messages |
| `impact-stat` | All | Computed stat ("X bikes funded") |
| `leaderboard` | Campaign, Team | Top fundraisers ranked |
| `countdown` | All | Days until event |
| `cta` | Participant | "Donate to [name]" button |
| `share` | Participant, Team | Social sharing links |
| `milestone-feed` | All | Auto-generated progress updates |
| `email-toolkit` | Participant (edit mode) | Copy-paste email examples |
| `team-invite` | Participant (edit mode) | Send invite or share join link |

### Default Page Configs

Campaign sets defaults. Participants can reorder blocks and edit content within their blocks, but cannot add arbitrary HTML or remove required blocks (CTA, info-block).

**Guardrails:**
- `info-block` is **locked** — content comes from campaign, participant can't edit or remove
- `cta` (donate button) is **locked** — always present, always functional
- `thermometer` is **locked** — always shows real data
- `personal-story`, `hero` — participant can edit freely
- Block order — participant can reorder within their page
- No custom HTML/CSS/JS injection — blocks only
- Profanity filter on user-generated text (personal story, team name)
- Image uploads go through moderation queue (or auto-scan)

### Config Inheritance

```
Campaign page_config (defaults)
  → Team page_config (can override)
    → Participant page_config (can override)
```

If participant hasn't customized, they get the campaign default. If they have, their overrides merge with the default (locked blocks stay locked).

---

## Registration Flow

### Participant Registration

```
1. Visit /raise-ride-2026/register
2. Fill out: name, email, phone, is_youth toggle
3. Pick a team (browse existing, use invite code, or skip)
4. Set personal goal (enforced >= adult_min_goal or youth_min_goal)
5. Pay registration fee (adult or youth rate)
   - Online: Stripe/PayPal checkout
   - Admin can mark as cash/check/waived later
6. Magic link sent to email → edit page
7. Participant lands on their edit page to customize
```

### Team Management

- **Create team**: During registration or from participant edit page
- **Join team**: Via invite code, browse + request, or invited by captain
- **Switch team**: Participant can switch until campaign goes active
- **Team captain**: Person who created the team. Can approve join requests.
- **Invites**: Captain sends invite email (through platform) → invitee gets link → registers or joins if already registered

---

## Donation Flow

### Online Donations

```
1. Visitor lands on participant page: /raise-ride-2026/sarah-chen
2. Clicks "Donate to Sarah" (CTA block)
3. Donation form: amount, name, email, message, anonymous toggle
4. Stripe/PayPal checkout
5. On success:
   a. Insert donation record
   b. Update participant raised total (computed)
   c. Update team raised total (computed)
   d. Update campaign raised total (computed)
   e. Send receipt email (Resend)
   f. Queue Bloomerang sync
6. Donor wall updates in real-time (Supabase realtime)
```

### Offline Donations (Admin)

```
1. Admin goes to campaign → donations → "Record Offline"
2. Selects participant to credit
3. Enters: donor name, amount, method (cash/check), check number, notes
4. Donation created with payment_method = cash|check
5. Same downstream effects (totals update, Bloomerang sync queued)
6. Audit trail in offline_payments table
```

---

## Email Strategy

**Decision: Participants send their own emails.** Anecdotal evidence shows fundraisers prefer their own email. The platform provides:

1. **Example language** — admin writes template copy per campaign, stored in `campaigns.email_templates` (JSONB array of { title, subject, body } objects)
2. **Copy-to-clipboard** — participant sees templates in their edit page, clicks to copy
3. **Pre-filled share links** — "Share via Email" opens mailto: with pre-filled subject/body and their fundraising link
4. **No sending infrastructure** — we don't send fundraising asks on their behalf

Platform-sent emails are limited to:
- Registration confirmation
- Donation receipts (to donors)
- Donation notifications (to participants — "Sarah, you just got a $50 donation!")
- Team invite/join notifications
- Campaign updates from admin (optional broadcast)

---

## Bloomerang Integration

### Donation Sync

Each donation syncs to Bloomerang as a transaction:

| Field | Source | Notes |
|-------|--------|-------|
| Constituent | Match by donor_email → Bloomerang account | Create if not found |
| Amount | donation.amount | |
| Fund | campaign.bloomerang_fund_id | |
| Campaign | campaign.bloomerang_campaign_id | |
| Date | donation.created_at | |
| Method | donation.payment_method | Map to Bloomerang method types |
| Appeal | TBD per campaign | Optional |

### Soft Credits (New)

When a donation is made to a participant's page, the **participant gets a soft credit** in Bloomerang:

```
Donation: $50 from Jane Doe to Sarah Chen's page
  → Hard credit: Jane Doe, $50, Fund: Raise and Ride
  → Soft credit: Sarah Chen, $50 (linked to same transaction)
```

This requires:
1. Participant has a `bloomerang_account_id` (matched during registration or manually by admin)
2. After creating the main transaction, call Bloomerang API to add soft credit
3. Store `bloomerang_soft_credit_id` on the donation record

### Registration Fee Sync

Registration fees also sync to Bloomerang:
- Separate fund ID for registration fees (not donation fund)
- Constituent = the participant themselves
- Method = online/cash/check per `registration_method`

### Sync Pattern

Same as raffle-page:
- Async via API route, never blocking user
- Retry queue with exponential backoff (1m → 5m → 15m → 1h → 6h → 24h)
- All attempts logged
- Admin can view sync status and trigger manual resync

---

## CHIRP-Ready Architecture

The goal is that when Bloomerang is eventually replaced, this data can flow into CHIRP. Design decisions to support this:

1. **`bloomerang_account_id` on participants** — same pattern as `core_contacts.bloomerang_id`
2. **Donation records are complete** — don't rely on Bloomerang as source of truth for P2P donations. The `donations` table has everything.
3. **Campaign structure maps to `chirp_campaigns`** — same concept, different scope
4. **Participant soft credits are tracked locally** — even if Bloomerang goes away, we know which participant sourced which donation
5. **Contact matching** — when building the CHIRP bridge, match participants and donors to `core_contacts` via email. For now, Bloomerang is the bridge.

### Future CHIRP Integration Points

| P2P Data | CHIRP Equivalent | Bridge |
|----------|-----------------|--------|
| Participant | `core_contacts` | Email match + bloomerang_id |
| Donation | `chirp_transactions` | Import with participant soft credit metadata |
| Campaign | `chirp_campaigns` | Direct mapping |
| Interactions (invites, notifications) | `chirp_interactions` | Event log import |

---

## Guardrails Summary

### Content Guardrails
- Locked blocks (info-block, CTA, thermometer) cannot be removed or edited by participants
- No custom HTML/CSS/JS — block system only
- Profanity filter on user-generated text
- Image uploads: size limit (2MB), type whitelist (jpg/png/webp), moderation queue
- Team names: profanity filter, length limit, no special characters

### Financial Guardrails
- Minimum goals enforced at registration (adult vs youth)
- Registration fees are non-refundable (configurable per campaign)
- Offline payments require admin role + audit trail
- All donation amounts validated server-side (min $1, max configurable)
- Duplicate payment detection (same payment_id)
- Refunds tracked in payment_status

### Access Guardrails
- Participants auth via magic link (no password, no account creation)
- Magic links expire after 24 hours, single-use
- Participants can only edit their own page
- Team captains can approve/decline join requests for their team only
- Admins auth via Google SSO (same pattern as other Phoenix tools)
- Admin actions (offline payments, manual sync) logged with admin user ID

### Data Guardrails
- Bloomerang sync is async — donation succeeds even if sync fails
- Raised totals are computed from donations table, never manually set
- Soft credits require matched bloomerang_account_id — skip if not matched, flag for admin
- All financial data immutable after creation (no editing donation amounts — only refund/void)

### Campaign Lifecycle Guardrails
- **Draft**: Only admins can see. No registration, no donations.
- **Registration**: Registration open. Participant pages visible but donation CTAs disabled.
- **Active**: Full functionality. Registration may still be open (configurable).
- **Closed**: Read-only. No new donations or registrations. Pages stay up for posterity.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js (App Router) | SSR for public pages, fast loads |
| Language | TypeScript | |
| Database | Supabase | **Separate instance from phoenix-core** |
| Auth (admin) | Supabase + Google SSO | Same pattern as WREN/BERP |
| Auth (participants) | Magic link via email | No passwords, low friction |
| Payments | Stripe (primary) + PayPal (optional) | BYO processor architecture |
| CRM | Bloomerang API | Donations + soft credits |
| Email | Resend | Receipts, notifications, magic links |
| Hosting | Vercel | SSR + API routes |
| Realtime | Supabase Realtime | Live donor wall, thermometer updates |
| Storage | Supabase Storage | Profile photos, hero images |

## Git Branch Convention

```
claude/{description}-{random-id}
```
Generate random ID: `$(openssl rand -hex 3)`

## Development

```bash
npm run dev          # Next.js dev server
npm run build        # Production build
npm run lint         # ESLint
```

---

## Build Priority

### Phase 1 — Core Platform (MVP)
1. Scaffold Next.js + Supabase
2. Campaign + participant + donation tables
3. Admin: create campaign, manage participants
4. Participant registration flow (with payment)
5. Participant page rendering (block system, SSR)
6. Donation flow (online, Stripe)
7. Thermometer + donor wall (realtime)
8. Receipt emails

### Phase 2 — Teams + Social
9. Team creation, join, invite flows
10. Team pages with roster block
11. Leaderboard (campaign + team level)
12. Milestone feed
13. Share links (social + email mailto)

### Phase 3 — Admin + Bloomerang
14. Offline payment recording
15. Bloomerang donation sync
16. Bloomerang soft credit sync
17. Registration fee sync
18. Admin campaign dashboard (stats, health)
19. Email templates / copy-to-clipboard toolkit

### Phase 4 — Polish
20. Campaign lifecycle management
21. Image upload + moderation
22. Profanity filter
23. Mobile optimization pass
24. Page customization UI for participants
25. Countdown, impact-stat blocks
