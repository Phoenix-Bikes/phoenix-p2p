# Phoenix Bikes — P2P Fundraising Platform

## This Project
- **Name**: Phoenix P2P — Peer-to-Peer Fundraising
- **Repo**: github.com/Phoenix-Bikes/phoenix-p2p
- **Deploys to**: fundraise.phoenixbikes.org (Vercel)
- **Database**: Separate Supabase instance (NOT phoenix-core)
- **Tech Stack**: Next.js (App Router) + React + TypeScript + Supabase + Vercel + Stripe/PayPal + Bloomerang API + Resend

## Purpose

Replace Qgiv for P2P fundraising events like Raise and Ride. Participants create fundraising pages, join teams, collect donations, and track progress. Admin sets up campaigns, manages registrations, records offline payments, and syncs everything to Bloomerang.

## Design Language

Inspired by the FootyWeather demo app (`/Users/tomshannon/footyweather-demo/src/App.jsx`). Adapted for Phoenix Bikes:

### Visual System

| Element | FootyWeather | Phoenix P2P |
|---------|-------------|-------------|
| Background | Navy `#0B1A2E` | Same dark navy base |
| Accent | Gold `#C9A84C` | Phoenix Orange `#F47F25` |
| Surface cards | `#111E32` with `#1E3550` borders | Same pattern |
| Text | Light `#E8ECF1`, muted `#8A98AB` | Same hierarchy |
| Fonts | Playfair Display (headings) + DM Sans (body) | Same pairing |
| Success/Error | Green `#34D399` / Red `#F87171` | Same |

### Component Patterns (from FootyWeather)

- **StatPill** — compact stat cards with label, value, trend indicator. Used for thermometer numbers, donor counts, team standings.
- **DashboardMini** — tappable cards with title, subtitle, and child content (mini charts, lists). Used for campaign overview blocks.
- **MiniBar / MiniLine** — inline micro-charts with animated transitions. Used for donation velocity, daily totals, goal progress.
- **Card system** — rounded corners (14px), subtle borders, hover states with gold→orange glow. Mobile-first (390px reference frame).
- **Animations** — `fadeSlideUp` on card entry, `shimmer` for loading states, `pulseGlow` for live indicators (new donation).

### Mobile-First

Public pages (campaign, team, participant) are designed mobile-first. The FootyWeather reference frame is 390px wide — donor pages should look great at that width and scale up gracefully. Most P2P sharing happens via text/social on phones, so the donation page a visitor lands on must be optimized for mobile.

### Admin vs Public

- **Public pages** (participant, team, campaign) — dark theme, polished, mobile-first, FootyWeather aesthetic
- **Admin dashboard** — can use a lighter/standard admin theme (Tailwind defaults). Doesn't need the same visual treatment. Function over form.

### AI-First Admin (Future — Aligned with CHIRP Redesign)

The admin side is designed to eventually support a **chat-first interface** (same direction as the CHIRP redesign):
- "Create a Raise and Ride campaign with 4 registration tiers" → AI generates config
- "Who's at risk of not hitting their goal?" → AI queries participants + donation data
- "Draft a midpoint check-in drip email" → AI generates copy with merge tokens
- "Show me daily donation velocity for the last week" → AI renders a DashboardMini with MiniBar chart

This is a future enhancement, not MVP. The block system and config-driven architecture make it possible — AI generates JSON configs, the renderer displays them. Same pattern as CHIRP workspaces.

---

## Architecture: Config-Driven Block Pages

Every public page (campaign, team, participant) is rendered from a **block config** — a JSON array that defines layout, content, and behavior. This makes pages lightweight, customizable, and fast to spin up.

Blocks are the building blocks of every page. The system provides sensible defaults per page type, but admins and participants can customize within guardrails.

---

## Data Model

### Hierarchy

```
Campaign (Raise and Ride 2026)
  ├── Registration Tiers (Adult Rider, Youth Rider, Virtual Supporter, etc.)
  ├── Incentive Tiers ($250 = shirt, $500 = jersey, $1000 = bike kit)
  ├── Drip Sequence (7 steps, relative to each participant's registration)
  ├── Campaign Updates (public feed, optional email notify)
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
| info_block | JSONB | Shared "why we're raising" content passed to all participant/team pages |
| page_config | JSONB | Default block layout for participant pages |
| team_page_config | JSONB | Default block layout for team pages |
| campaign_page_config | JSONB | Block layout for the main campaign page |
| bloomerang_campaign_id | TEXT | Bloomerang campaign for donation sync |
| bloomerang_fund_id | TEXT | Bloomerang fund for donation allocation |
| bloomerang_registration_fund_id | TEXT | Separate fund for registration fee sync |
| big_donation_threshold | DECIMAL | Slack alert threshold (e.g. $500) |
| slack_channel_id | TEXT | Slack channel for campaign notifications |
| drip_time_compression | BOOLEAN | Testing flag: delays become minutes instead of days |
| registration_start | TIMESTAMPTZ | When registration opens |
| registration_end | TIMESTAMPTZ | When registration closes |
| event_date | TIMESTAMPTZ | The actual event date |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `registration_tiers`
Flexible, unlimited registration options per campaign. Replaces hardcoded adult/youth.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| campaign_id | UUID | FK → campaigns |
| name | TEXT | "Adult Rider", "Youth Rider", "Virtual Supporter", "Corporate Team Lead" |
| fee | DECIMAL | Registration fee for this tier |
| min_goal | DECIMAL | Minimum fundraising goal for this tier |
| description | TEXT | What this tier includes |
| eligibility_note | TEXT | "Ages 12-17", "Must represent a company", etc. |
| sort_order | INT | Display order on registration form |

Admin creates as many tiers as needed. No code change required to add a new tier — it's just a database row.

#### `campaign_incentives`
Rewards at different fundraising levels. Shown on participant's **profile/edit page only**, not public page.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| campaign_id | UUID | FK → campaigns |
| threshold_amount | DECIMAL | Amount raised to unlock (e.g. $250, $500, $1000) |
| reward_name | TEXT | "Campaign T-Shirt", "VIP Parking", etc. |
| reward_description | TEXT | Details about the reward |
| reward_image_url | TEXT | Optional photo of the reward |
| sort_order | INT | Display order (lowest threshold first) |

Unlock status is computed server-side: `SELECT SUM(amount) FROM donations WHERE participant_id = X AND payment_status = 'completed'`. No editable "raised" field exists — impossible to fake.

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
| registration_tier_id | UUID | FK → registration_tiers |
| first_name | TEXT | |
| last_name | TEXT | |
| email | TEXT | Registration email |
| phone | TEXT | Optional |
| slug | TEXT | URL slug for their page |
| personal_goal | DECIMAL | Their fundraising goal (>= tier min_goal) |
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

#### `campaign_updates`
Public feed on campaign page with optional participant notification.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| campaign_id | UUID | FK → campaigns |
| title | TEXT | Update headline |
| body | TEXT | Rich text content |
| notify_participants | BOOLEAN | If true, email all participants when published |
| published_at | TIMESTAMPTZ | When it went live |
| created_by | UUID | FK → admin_users |
| created_at | TIMESTAMPTZ | |

Default is quiet — update appears on page, no email. Admin explicitly toggles "Send email notification" for important updates only (e.g. "Pickup location changed").

#### `campaign_media`
Photos and videos managed by admin and pushed to all participant/team/campaign pages via the `media-gallery` block.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| campaign_id | UUID | FK → campaigns |
| type | ENUM | photo, video |
| url | TEXT | Supabase Storage URL (photos) or external embed URL (YouTube, Vimeo) |
| thumbnail_url | TEXT | Auto-generated for videos, resized for photos |
| title | TEXT | Optional caption |
| description | TEXT | Optional longer description |
| sort_order | INT | Display order in gallery |
| published | BOOLEAN | Toggle visibility without deleting |
| uploaded_by | UUID | FK → admin_users |
| created_at | TIMESTAMPTZ | |

**How it works:**
- Admin uploads photos or pastes video URLs (YouTube/Vimeo) in campaign dashboard
- Media appears on **every participant and team page** via the `media-gallery` block — participants don't control this content
- This is how Phoenix Bikes showcases youth impact across all fundraiser pages without relying on each participant to add media
- The `media-gallery` block is **locked** — participants can't remove it (same as info-block)
- Admin can toggle `published` to show/hide individual items without deleting
- Photos stored in Supabase Storage; videos are embedded from YouTube/Vimeo (no self-hosting video)

#### `drip_sequences`
Automated email sequence, relative to each participant's registration date.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| campaign_id | UUID | FK → campaigns |
| step_number | INT | 1, 2, 3... (order within sequence) |
| name | TEXT | "Welcome", "First Ask Nudge", etc. |
| subject | TEXT | Email subject, supports merge tokens |
| body | TEXT | Rich text with merge tokens |
| delay_type | ENUM | `from_registration` or `before_event` |
| delay_days | INT | Days after registration, or days before event |
| skip_if_days_remaining_lt | INT | Skip this step if fewer than N days until event |
| enabled | BOOLEAN | Toggle individual steps on/off |

#### `drip_sends`
Tracks what's been sent to whom.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| participant_id | UUID | FK → participants |
| sequence_step_id | UUID | FK → drip_sequences |
| sent_at | TIMESTAMPTZ | When it was sent |
| opened_at | TIMESTAMPTZ | Resend webhook (optional tracking) |

#### `email_broadcasts`
One-off admin emails to all participants or a segment.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| campaign_id | UUID | FK → campaigns |
| subject | TEXT | Supports merge tokens |
| body | TEXT | Rich text with merge tokens |
| segment_filter | JSONB | Filter criteria (see Segments section) |
| sent_by | UUID | FK → admin_users |
| sent_at | TIMESTAMPTZ | |
| recipient_count | INT | How many were sent |

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
  │     ├── registrations/                 Registration + tier management
  │     ├── incentives/                    Incentive tier management
  │     ├── drips/                         Drip sequence editor
  │     ├── broadcasts/                    One-off email broadcasts
  │     ├── updates/                       Campaign updates feed manager
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
| `share` | Participant, Team | Copy link, social sharing, QR code, mailto |
| `milestone-feed` | All | Auto-generated progress updates |
| `campaign-updates` | Campaign | Public update feed from admin |
| `media-gallery` | All | Campaign photos + videos pushed by admin to all pages |
| `email-toolkit` | Participant (edit mode only) | Copy-paste email examples |
| `team-invite` | Participant (edit mode only) | Send invite or share join link |
| `incentive-tracker` | Participant (edit mode only) | Unlocked/locked rewards with gap amounts |

### Default Page Configs

Campaign sets defaults. Participants can reorder blocks and edit content within their blocks, but cannot add arbitrary HTML or remove required blocks.

**Guardrails:**
- `info-block` is **locked** — content comes from campaign, participant can't edit or remove
- `cta` (donate button) is **locked** — always present, always functional
- `thermometer` is **locked** — always shows real data
- `media-gallery` is **locked** — admin-managed photos/videos of youth impact, pushed to all pages
- `personal-story`, `hero` — participant can edit freely
- Block order — participant can reorder within their page
- No custom HTML/CSS/JS injection — blocks only
- Profanity filter on user-generated text (personal story, team name)
- Image uploads: size limit (2MB), type whitelist (jpg/png/webp), moderation queue or auto-scan
- Team names: profanity filter, length limit, no special characters

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
2. Select registration tier (Adult Rider, Youth Rider, Virtual Supporter, etc.)
3. Fill out: name, email, phone
4. Pick a team (browse existing, use invite code, or skip)
5. Set personal goal (enforced >= selected tier's min_goal)
6. Pay registration fee (amount from selected tier)
   - Online: Stripe/PayPal checkout
   - Admin can mark as cash/check/waived later
7. Beehiiv API: tag participant email with p2p-{campaign-slug}
8. Magic link sent to email → edit page
9. Participant lands on their edit page to customize
10. Drip sequence begins (step 1: welcome, immediate)
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
   a. Insert donation record (amount from Stripe/PayPal server confirmation, NOT client)
   b. Send receipt email to donor (Resend)
   c. Send donation notification email to participant
   d. Check if participant crossed a milestone (25/50/75/100%) → milestone email
   e. Check if donation >= big_donation_threshold → Slack alert
   f. Check if campaign crossed a milestone → Slack alert
   g. Queue Bloomerang sync (donation + soft credit)
6. Donor wall updates in real-time (Supabase realtime)
7. Thermometer updates (computed from donations table)
```

### Offline Donations (Admin)

```
1. Admin goes to campaign → donations → "Record Offline"
2. Selects participant to credit
3. Enters: donor name, amount, method (cash/check), check number, notes
4. Donation created with payment_method = cash|check, recorded_by = admin ID
5. Same downstream effects (totals update, notifications, Bloomerang sync queued)
6. Audit trail in offline_payments table
```

---

## Email & Communication

### Email Strategy

**Participants send their own fundraising asks.** Anecdotal evidence shows fundraisers prefer their own email over platform-sent asks. The platform provides copy-paste templates, not sending infrastructure for outbound asks.

### Platform-Sent Emails (via Resend)

| Type | Trigger | Recipient |
|------|---------|-----------|
| Registration confirmation | On registration | Participant |
| Magic link | On request | Participant |
| Drip sequence emails | Cron (relative to registration) | Participant |
| Donation receipt | On donation | Donor |
| Donation notification | On donation | Participant |
| Milestone celebration | On milestone crossing | Participant |
| Team join request | On request | Team captain |
| Team invite | On invite | Invitee |
| Team join accepted | On acceptance | Captain + new member |
| Campaign update (optional) | Admin toggle per post | All participants |
| Admin broadcast | Admin manually | Segment of participants |

### Merge Tokens

Available in drip emails, broadcasts, campaign update notifications, and email templates:

```
{{first_name}}                → "Sarah"
{{last_name}}                 → "Chen"
{{raised_amount}}             → "$340"
{{personal_goal}}             → "$500"
{{percent_to_goal}}           → "68%"
{{team_name}}                 → "Arlington Riders"
{{team_raised}}               → "$2,100"
{{next_incentive_name}}       → "Campaign Jersey"
{{next_incentive_gap}}        → "$160 more to unlock the jersey!"
{{donor_count}}               → "12"
{{campaign_name}}             → "Raise and Ride 2026"
{{campaign_raised}}           → "$18,500"
{{campaign_goal}}             → "$30,000"
{{days_remaining}}            → "14"
{{fundraising_page_url}}      → "fundraise.phoenixbikes.org/raise-ride-2026/sarah-chen"
{{edit_page_url}}             → "fundraise.phoenixbikes.org/raise-ride-2026/sarah-chen/edit?token=..."
{{registration_tier_name}}    → "Adult Rider"
```

### Drip Sequences

Each participant gets the same email sequence starting from **their** registration date. Late registrants get a compressed version — steps that need minimum runway are automatically skipped.

#### Example Sequence

| Step | Content | Delay | Skip If < N Days Left |
|------|---------|-------|-----------------------|
| 1 | Welcome + set up your page | Immediate | Never skip |
| 2 | Share your page — here's email templates to copy | Day 1 | 2 days |
| 3 | First $100 matters — data shows early asks = more raised | Day 3 | 5 days |
| 4 | Incentive tracker — here's what you can unlock | Day 5 | 7 days |
| 5 | Midpoint check-in — your progress + team standings | Day 10 | 10 days |
| 6 | Final push — 3 days left, here's what works | 3 days before event | Never skip |
| 7 | Thank you + your impact summary | 1 day after event | Never skip |

#### Late Registrant Behavior

- **30 days out**: All 7 emails, naturally spaced
- **8 days out**: Steps 1, 2, 3, 6, 7 (steps 4-5 skipped — fewer than 7 and 10 days remaining)
- **2 days out**: Steps 1, 6, 7 only (welcome immediately, final push tomorrow, thank you after event)

#### Drip Cron Job

Runs every few hours during active campaigns:
1. For each active campaign, for each participant
2. Calculate which step they should be on (registration date + delays + skip rules)
3. Check `drip_sends` — already sent?
4. If not, render email with live data via merge tokens, send via Resend
5. Log to `drip_sends`
6. **Max 1 email per participant per day** — if multiple steps are due, send the most important, queue the rest

#### Time Compression (Testing)

`campaigns.drip_time_compression` flag. When enabled by admin, delays switch from days to minutes. A 30-day drip sequence plays out in ~30 minutes. Protected behind admin auth, never exposed in production.

### Admin Broadcasts

One-off emails to all participants or a segment. Uses the same merge token system. Separate from drip sequences.

#### Broadcast Segments

| Segment | Filter |
|---------|--------|
| All participants | No filter |
| Team captains | `role = captain` |
| Specific registration tier | `registration_tier_id = X` |
| Under X% of goal | `raised / personal_goal < X` |
| Specific team | `team_id = X` |
| No donations yet | `raised = 0` |

### Email Templates (Copy-to-Clipboard)

Admin writes example email copy per campaign. Stored in a campaign config. Participants see templates on their edit page with a "Copy" button. Templates include their fundraising link pre-filled.

This is NOT a sending system — participants copy the text and paste it into their own email client.

### Beehiiv Newsletter Sync

- **On registration**: API call to Beehiiv to add participant email with tag `p2p-{campaign-slug}`
- **On campaign close**: Batch API call to remove the tag from all campaign participants
- Main newsletter segments exclude the P2P tag so participants aren't double-emailed during the campaign
- Two API calls total. Beehiiv stays the newsletter tool. P2P app handles all campaign communication.

---

## Social Sharing

### Share Block

Available on participant and team pages:

- **Copy link** — copies fundraising URL to clipboard
- **Social sharing** — pre-filled posts for Facebook, Instagram, X (Twitter), LinkedIn
- **Email share** — `mailto:` with pre-filled subject and body including their fundraising link
- **QR code** — auto-generated from their URL, good for in-person sharing

### What We're NOT Building

- **Referral link tracking** — donation-to-participant attribution is already built in (`participant_id` on every donation). Recruitment tracking exists via `team_invites`. No need for referral codes.
- **Viral/gamification rewards** — shares, signups, likes, engagement scoring add complexity with marginal ROI. Personal asks (email, text, in-person) drive P2P revenue, not gamification.
- **Social share counts** — vanity metric that doesn't drive donations.

---

## Notification System

### Participant Notifications (Email via Resend)

| Notification | Trigger | Content |
|-------------|---------|---------|
| Donation received | On donation insert | "You got a $50 donation from Jane! You're now at $340 (68% of goal)" |
| Personal milestone | Raised total crosses 25/50/75/100% of goal | "You just hit 50% of your goal!" |
| Team join request | Someone requests to join (captain only) | "Mike wants to join Arlington Riders" |
| Team invite accepted | Invitee accepts | "Sarah joined your team!" |
| Campaign update | Admin publishes with notify toggle ON | Update content |

Participants are external volunteers, not staff. Email is the only reliable channel. No push notifications, no SMS, no Slack for participants.

### Staff Notifications (Slack)

| Message Type | Trigger | Channel | Content |
|-------------|---------|---------|---------|
| Daily digest | Cron, end of business | `#raise-and-ride-2026` | Total raised today, donation count, cumulative total, % to goal, top fundraiser of the day |
| Campaign milestone | Raised total crosses 25/50/75/100% | Same channel | "Raise & Ride just hit 50% of goal! $15,000 raised from 127 donors" |
| Big donation | Amount >= `big_donation_threshold` | Same channel | "$1,000 from Arlington Cycling Club to Team Spokes" |

Reuses WREN Slack patterns: same `SLACK_BOT_TOKEN`, same `postMessage` helper. Daily digest is a Vercel cron job. Milestone/big donation alerts fire from donation insert API route.

**NOT building:** Real-time Slack firehose of every donation (noise that gets muted), participant Slack channel (friction, cost, moderation burden).

### Campaign Updates Feed

Public feed on the campaign page. Visitors and participants see updates when they visit.

- **Default: quiet** — update appears on page, no notification
- **Optional: loud** — admin toggles "Send email notification" per post

Most updates are passive ("Course map is live!"). A few are important enough to email ("Pickup location changed"). One toggle per post.

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

### Soft Credits

When a donation is made to a participant's page, the **participant gets a soft credit** in Bloomerang:

```
Donation: $50 from Jane Doe to Sarah Chen's page
  → Hard credit: Jane Doe, $50, Fund: Raise and Ride
  → Soft credit: Sarah Chen, $50 (linked to same transaction)
```

Requirements:
1. Participant has a `bloomerang_account_id` (matched during registration or manually by admin)
2. After creating the main transaction, call Bloomerang API to add soft credit
3. Store `bloomerang_soft_credit_id` on the donation record
4. If participant not matched in Bloomerang, skip soft credit and flag for admin

### Registration Fee Sync

Registration fees also sync to Bloomerang:
- Fund: `campaign.bloomerang_registration_fund_id` (separate from donation fund)
- Constituent = the participant themselves
- Method = online/cash/check per `registration_method`

### Sync Pattern

Same as raffle-page:
- Async via API route, never blocking user
- Retry queue with exponential backoff (1m → 5m → 15m → 1h → 6h → 24h)
- All attempts logged to `bloomerang_sync_queue`
- Admin can view sync status and trigger manual resync

---

## CHIRP-Ready Architecture

The goal is that when Bloomerang is eventually replaced, this data can flow into CHIRP. Design decisions to support this:

1. **`bloomerang_account_id` on participants** — same pattern as `core_contacts.bloomerang_id`
2. **Donation records are complete** — don't rely on Bloomerang as source of truth for P2P donations
3. **Campaign structure maps to `chirp_campaigns`** — same concept, different scope
4. **Participant soft credits are tracked locally** — even if Bloomerang goes away, we know which participant sourced which donation
5. **Contact matching** — when building the CHIRP bridge, match participants and donors to `core_contacts` via email

### Future CHIRP Integration Points

| P2P Data | CHIRP Equivalent | Bridge |
|----------|-----------------|--------|
| Participant | `core_contacts` | Email match + bloomerang_id |
| Donation | `chirp_transactions` | Import with participant soft credit metadata |
| Campaign | `chirp_campaigns` | Direct mapping |
| Interactions (invites, notifications) | `chirp_interactions` | Event log import |

---

## Security

### Attack Surfaces & Mitigations

| Surface | Mitigation |
|---------|-----------|
| **Donation amount manipulation** | Amounts come from Stripe/PayPal server-side confirmation. Client never tells server the amount — payment processor does. |
| **Fake raised totals / incentive gaming** | Raised totals are `SELECT SUM(amount) FROM donations WHERE participant_id = X AND payment_status = 'completed'`. Never stored as editable field. Incentive unlocks checked server-side against computed total. |
| **Page content injection (XSS)** | Block system only — no raw HTML input. Text fields sanitized server-side (strip tags, escape). Images via Supabase Storage with type/size validation. |
| **Magic link auth abuse** | Single-use, 24-hour expiry. Cryptographically random tokens. Each use invalidates previous token. Rate limit: max 3 requests per email per hour. Only grants access to that participant's page. |
| **Registration fee bypass** | `registration_fee_paid` set server-side after payment confirmation. Page hidden/non-functional until confirmed. Admin can mark "waived" (audit logged). |
| **Cross-participant access** | Magic link token scoped to participant ID. API validates token ownership on every edit request. |
| **Bloomerang sync tampering** | Sync runs server-side with service role key. Participants have zero access to sync logic. |
| **Profanity / inappropriate content** | Filter on save for personal stories and team names. Image uploads: 2MB limit, jpg/png/webp only, moderation queue or auto-scan. |

**Core principle:** The client is a renderer, never a source of truth. Every number that matters (amounts, totals, thresholds, unlock status) is computed or confirmed server-side.

### Where AI Helps (and Doesn't)

| Use AI For | Don't Use AI For |
|-----------|-----------------|
| Campaign setup ("Create Raise and Ride with 4 tiers") | Validating donation amounts |
| Drafting email templates and drip copy | Computing raised totals |
| "Who's at risk of not hitting goal?" queries | Payment processing |
| Suggesting incentive thresholds from past data | Access control |
| Personal story starters for participants | Approving team joins |

AI helps create content and get insights. It never touches money, access, or data integrity.

---

## Testing Strategy

### Payment Testing
- **Stripe**: Test mode with test card numbers (`4242 4242 4242 4242`). Real flow, fake money.
- **PayPal**: Sandbox mode (same pattern as raffle-page).
- **Offline**: Create directly in admin — no external dependency.
- **Duplicate detection**: Submit same payment_id twice, verify rejection.

### Email Testing
- **Receipts/notifications**: Resend test mode or send to own email.
- **Drip sequences**: Time compression flag changes "Day 3" to "3 minutes". Watch full sequence in ~1 hour.
- **Merge tokens**: Create test participant, donate to them, verify emails render their live data.
- **Skip logic**: Register test participant with 2 days remaining, verify only welcome + final push send.

### Bloomerang Testing
- **Donation sync**: Test against Bloomerang sandbox if available, or prod with known test constituent.
- **Soft credits**: Create test donation, verify hard credit (donor) + soft credit (participant) both appear.
- **Constituent matching**: Test existing email (verify match) and new email (verify creation).
- **Retry queue**: Kill sync mid-flight, verify retry on next cron.

### Slack Testing
- Use `#p2p-test` channel during development, switch to real channel for production.
- **Daily digest**: Trigger cron manually, verify message format.
- **Milestone alert**: Donate enough to cross 25%, verify alert fires.
- **Big donation**: Donate over threshold, verify alert.

### Page / Block System Testing
- Default blocks render on new participant page.
- Block customization persists and renders.
- Locked blocks (info-block, CTA, thermometer) reject removal via API.
- Thermometer accuracy: donate $50, verify shows $50.
- Donor wall realtime: open in one tab, donate in another, verify update.
- Mobile: Vercel preview URL on phone.

### Registration + Team Testing
- Full registration with payment across different tiers.
- Tier-specific min goal enforcement.
- Team create → captain role.
- Team join via invite code.
- Team join request → captain notification.
- Team switch before campaign goes active.
- Late registration drip compression.

### Security Testing
- Magic link expiry (24h) and single-use.
- Cross-participant access (Sarah's link can't edit Mike's page).
- Donation amount tampering (modify client-side, verify server uses Stripe-confirmed amount).
- Rate limiting (4 magic link requests in 1 hour, 4th blocked).
- XSS injection (`<script>alert('xss')</script>` in personal story, verify sanitized).

### End-to-End Smoke Test

```
1.  Admin creates campaign with 3 registration tiers, 4 incentives, 5 drip steps
2.  Participant A registers (adult tier), pays test fee, gets magic link
3.  Participant A creates team, customizes page
4.  Participant B registers (youth tier), joins team via invite code
5.  Donor donates $50 to Participant A (Stripe test)
6.  Verify: receipt email, donation notification, thermometer, donor wall,
    Bloomerang sync, soft credit, Slack alert (if over threshold)
7.  Admin records $100 offline donation to Participant B
8.  Verify: totals update (participant, team, campaign)
9.  Trigger drip cron — verify correct emails sent to A and B
10. Verify: incentive unlocked for A at $150 threshold
11. Admin posts campaign update with notify toggle ON — verify emails
12. Admin sends broadcast to "under 50% of goal" segment — verify delivery
```

### Test Infrastructure
- **Vercel preview deploys** for every branch — test there, not localhost
- **Seed script** that creates a test campaign with tiers, incentives, teams, participants, and donations
- **Time compression toggle** for drip sequence testing

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
| Email | Resend | Receipts, notifications, drips, broadcasts, magic links |
| Newsletter | Beehiiv | Segment sync only (tag on register, untag on close) |
| Messaging | Slack API | Staff notifications (daily digest, alerts) |
| Hosting | Vercel | SSR + API routes + cron jobs |
| Realtime | Supabase Realtime | Live donor wall, thermometer updates |
| Storage | Supabase Storage | Profile photos, hero images, incentive images |

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

## Build Phases

### Phase 1 — Core Platform (MVP)
1. Scaffold Next.js + Supabase (separate instance)
2. Database: campaigns, registration_tiers, participants, donations, admin_users
3. Admin: create campaign, define registration tiers, manage participants
4. Participant registration flow (tier selection, payment)
5. Participant page rendering (block system, SSR)
6. Donation flow (online, Stripe)
7. Thermometer + donor wall (Supabase realtime)
8. Receipt emails + donation notification emails (Resend)
9. Magic link auth for participant page editing

### Phase 2 — Teams + Social
10. Team creation, join, invite flows
11. Team pages with roster block
12. Leaderboard (campaign + team level)
13. Share block (copy link, social, QR, mailto)
14. Milestone notifications (personal + team)

### Phase 3 — Communication
15. Drip sequences (tables, cron, merge tokens, skip logic)
16. Email templates / copy-to-clipboard toolkit
17. Campaign updates feed (public page + optional notify)
18. Admin broadcast emails (segments + merge tokens)
19. Beehiiv sync (tag on register, untag on close)

### Phase 4 — Admin + Integrations
20. Campaign incentive tiers (table, profile display, unlock logic)
21. Offline payment recording (audit trail)
22. Bloomerang donation sync
23. Bloomerang soft credit sync
24. Bloomerang registration fee sync
25. Slack integration (daily digest cron, milestone alerts, big donation alerts)
26. Admin campaign dashboard (stats, health, sync status)

### Phase 5 — Polish + Testing
27. Campaign lifecycle management (draft → registration → active → closed)
28. Image upload + moderation
29. Profanity filter
30. Mobile optimization pass
31. Page customization UI for participants (block reordering)
32. Seed script + E2E smoke test
33. Time compression toggle for drip testing
34. Countdown, impact-stat blocks

---

## Campaign Lifecycle Guardrails

| Status | Visibility | Registration | Donations | Participant Edits |
|--------|-----------|-------------|-----------|-------------------|
| **Draft** | Admin only | Closed | Disabled | N/A |
| **Registration** | Public | Open | Disabled (CTAs hidden) | Yes |
| **Active** | Public | Configurable (open or closed) | Enabled | Yes |
| **Closed** | Public (read-only) | Closed | Disabled | No |

Pages stay up after close for posterity. No new donations or registrations.
