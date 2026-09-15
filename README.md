# FLIRTY

**MEET • FLIRT • BELONG**

FLIRTY is a production-grade dating/social platform. The backend, authentication,
database, recommendations, messaging, subscriptions and admin control center are
all first-party — no BaaS, no hosted auth, no Firebase/Supabase/Clerk.

## Stack

- Next.js App Router + TypeScript
- PostgreSQL + Prisma
- Redis (self-hosted) for rate limits, presence and cache
- Socket.IO for authenticated realtime chat
- Argon2id sessions in HTTP-only cookies
- Local/MinIO media storage

## Vercel

Production tracks **`master`** (also mirrored to `main`). If `DATABASE_URL` is not set, the Vercel build provisions Prisma Postgres and seeds demo accounts. Set these environment variables for a permanent database:

- `DATABASE_URL` — PostgreSQL connection string (or Vercel `POSTGRES_URL`)
- `SESSION_SECRET` — 32+ character secret
- `APP_URL` — `https://your-domain.vercel.app`
- `REDIS_URL` — optional; in-memory limits are used if Redis is unreachable

Demo login after a bootstrap deploy: `admin@flirty.local` / `FlirtyAdmin!234` and `elena@flirty.local` / `FlirtyDev!234`. Claim the Prisma database from the Vercel build logs if you want it to survive 24 hours.


```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Seed accounts

| Role | Email | Password |
| --- | --- | --- |
| Member | elena@flirty.local | FlirtyDev!234 |
| Member | nikos@flirty.local | FlirtyDev!234 |
| Admin | admin@flirty.local | FlirtyAdmin!234 |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js + Socket.IO custom server |
| `npm run test` | Unit + security tests |
| `npm run typecheck` | Strict TypeScript |
| `npm run lint` | ESLint |
| `npm run build` | Production build |

## Account deletion

Delete Account anonymizes profile, photos, preferences, sessions and personal
fields. Messages in remaining conversations are replaced with a deletion
placeholder. Safety reports and billing ledger rows needed for legal retention
are kept without personal identifiers. See `src/server/users/deletion.ts`.
