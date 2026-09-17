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

Production tracks **`master`** (also mirrored to `main`). Login needs a **permanent** Postgres owned by the Vercel project — throwaway 24h/72h databases are not used.

1. Vercel → Storage → Create Database → Neon/Postgres (connect Production)
2. Settings → Environment Variables → `SESSION_SECRET` (32+ chars) and `APP_URL=https://flirty-ten.vercel.app`
3. Redeploy Production. The build runs `prisma migrate deploy` and seeds demo accounts.

Vercel Storage sets `POSTGRES_URL` / `POSTGRES_PRISMA_URL`. You can also set `DATABASE_URL` yourself. See `/setup`.

Demo login after that deploy: `admin@flirty.local` / `FlirtyAdmin!234` and `elena@flirty.local` / `FlirtyDev!234`.


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
