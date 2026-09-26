# TimeTogether 🗓️

A private shared calendar app for couples — see each other's availability across timezones, find overlapping free time, and plan things together.

Built with **Next.js 14**, **Supabase**, and **TypeScript**.

---

## Features

- 🔐 **Authentication** — Email sign-up / login via Supabase Auth
- 📅 **Shared Calendar** — Private 2-person calendar with invite codes
- 🌍 **Timezone-aware** — Each user sets their own timezone; all times display correctly for both
- ✅ **Availability blocks** — Mark yourself as FREE or BUSY on any date/time range
- 🔍 **Find Time** — Automatically detects overlapping free windows between both partners
- 📝 **Plans** — Create and manage shared events on your calendar
- ⚡ **Realtime** — Availability and events sync live via Supabase Realtime
- 📱 **PWA** — Installable as an app on mobile and desktop

---

## Getting Started (Run Locally)

### Prerequisites

- [Node.js 18+](https://nodejs.org/)
- A [Supabase](https://supabase.com) account and project

### 1. Clone the repo

```bash
git clone https://github.com/Rohit-Makattil/Plan.git
cd Plan
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → **New Query**
3. Paste the entire contents of [`supabase/schema.sql`](./supabase/schema.sql) and click **Run**
4. Go to **Authentication → Providers → Email** and turn **"Confirm email" OFF** (for development)

### 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Then edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Find these values in: **Supabase Dashboard → Settings → API**

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the app is live.

---

## Deploy to Vercel (Free)

The fastest way to share the app publicly:

### Option A — One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Rohit-Makattil/Plan)

1. Click the button above
2. Connect your GitHub account
3. Add environment variables when prompted:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy** — done in ~2 minutes

### Option B — Vercel CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts and add your env vars.

---

## Database Schema

The full schema is in [`supabase/schema.sql`](./supabase/schema.sql). Tables:

| Table | Purpose |
|---|---|
| `profiles` | User profile (name, timezone, country) |
| `shared_calendars` | A 2-person shared calendar with invite code |
| `calendar_members` | Who belongs to which calendar (owner / member) |
| `availability_blocks` | FREE/BUSY time blocks per user |
| `events` | Shared plans/events on the calendar |

RLS (Row Level Security) is enabled on all tables. Policies use `SECURITY DEFINER` helper functions to avoid recursive evaluation.

---

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Home / Connect with partner
│   ├── calendar/           # Main calendar view
│   ├── find-time/          # Find overlapping free time
│   └── plans/              # Shared plans/events
├── components/             # Reusable UI components
├── context/                # Auth + Calendar React context
├── lib/                    # Supabase client, find-time logic, utils
├── supabase/
│   ├── schema.sql          # Full database schema + RLS policies
│   └── migrations/         # Incremental migration files
└── types/                  # TypeScript types for DB tables
```

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Styling | Tailwind CSS |
| Deployment | Vercel |

---

## License

MIT
