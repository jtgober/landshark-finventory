# Landshark Triathlon Club

A club site where members connect their Strava account, show up on a
leaderboard, and give each other in-app kudos. Built with Next.js
(App Router), NextAuth, Prisma, and Postgres.

## How it works

- Members sign in with **"Connect with Strava"**, which is a normal OAuth
  flow (`read,activity:read` scope). We store their access/refresh tokens.
- We register **one Strava webhook subscription** for the whole app.
  Whenever a connected member creates, updates, or deletes an activity,
  Strava POSTs an event to `/api/strava/webhook`. We look up the member by
  their Strava athlete id, fetch the activity detail, and upsert it into
  our own database.
- There is **no historical backfill** — only activities recorded after a
  member connects will show up. This keeps the app well within Strava's
  API rate limits (200 requests/15 min, 2,000/day per app) even at 300+
  members, since steady-state traffic is roughly one API call per new
  activity. If backfill is wanted later, it should be done as a
  rate-limited background job, staggered across users, not a bulk sync.
- The dashboard aggregates stored activities into a leaderboard
  (this week / this month / all time) and a recent activity feed where
  members can give kudos.

## Setup

### 1. Create a Strava API application

Go to https://www.strava.com/settings/api and create an app. Note the
**Client ID** and **Client Secret**. Set the "Authorization Callback
Domain" to your deployed domain (e.g. `landshark.example.com`), or
`localhost` while developing locally.

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in:

- `DATABASE_URL` — a Postgres connection string.
- `NEXTAUTH_URL` / `NEXTAUTH_SECRET` — `NEXTAUTH_SECRET` can be generated
  with `openssl rand -base64 32`.
- `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` — from step 1.
- `STRAVA_WEBHOOK_VERIFY_TOKEN` — any random string you choose.
- `APP_URL` — only needed for the webhook subscription scripts (step 5);
  must be a publicly reachable HTTPS URL.

### 3. Install dependencies and set up the database

```bash
npm install
npm run prisma:migrate
```

### 4. Run the app

```bash
npm run dev
```

### 5. Register the webhook subscription (one-time, per environment)

Strava allows exactly one push subscription per app, and it validates the
callback URL by calling it, so the app needs to be reachable first. Once
deployed (or tunneled locally with something like `ngrok http 3000`, using
that URL as `APP_URL`):

```bash
npm run webhook:create   # registers the subscription
npm run webhook:view     # confirms it and shows its id
npm run webhook:delete <id>   # only if you need to re-register
```

## Deploying

Any Next.js host works. The path of least resistance is **Vercel** (for the
app) + a managed Postgres like **Neon** or **Supabase** (for `DATABASE_URL`) —
both have generous free tiers, which is plenty for a club this size. Set the
env vars from `.env.example` in your host's dashboard, then run
`npm run prisma:deploy` against the production database before (or as part
of) your first deploy.

## Mobile

Most members will use this from their phones, so the UI is built mobile-first
with Tailwind: single-column layouts, no fixed-width elements, and touch
targets (kudos button, range filters, connect button) sized at 44px or more.
Test locally with your browser's device toolbar (e.g. Chrome DevTools →
Toggle device toolbar) at common widths like 375px (iPhone SE) and 390px
(iPhone 12/13/14).

## Notes on scale

At ~300 members, steady-state webhook traffic (a handful of activities per
member per day) is nowhere near Strava's default rate limit. The thing to
avoid is a bulk sync of everyone's history at once, which is why this app
deliberately doesn't do backfill. If you later want a "one-time catch-up"
feature, implement it as a queued, rate-limited job — a few users at a
time with backoff — rather than looping over all members synchronously.
