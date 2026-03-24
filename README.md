# FinanceFrz

[![CI](https://github.com/sharf-shawon/FinanceFrz/actions/workflows/ci.yml/badge.svg)](https://github.com/sharf-shawon/FinanceFrz/actions/workflows/ci.yml)
[![Docker](https://github.com/sharf-shawon/FinanceFrz/actions/workflows/docker.yml/badge.svg)](https://github.com/sharf-shawon/FinanceFrz/actions/workflows/docker.yml)
[![Coverage](https://img.shields.io/badge/coverage-93.8%25-brightgreen)](https://github.com/sharf-shawon/FinanceFrz/actions/workflows/ci.yml)

A Personal Finance App for Frz

## Getting Started

### Local development (plain Node)

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Local development (Docker)

```bash
cp .env.example .env
docker compose up
```

### Production (Docker)

```bash
cp .env.example .env   # fill in all secrets
docker compose -f docker-compose.prod.yml up -d
```

The production image in this repository is configured for SQLite/libSQL URLs.
Set `DATABASE_URL_PROD` to a value such as `file:/app/data/prod.db` (this is the compose default).
On container startup, Prisma runs `db push` automatically to ensure required SQLite tables exist.

## Testing

```bash
# Run all tests
npm test

# Run with watch mode
npm run test:watch

# Run with coverage report (enforces ≥80% thresholds)
npm run test:coverage
```

**Current coverage: 93.8% statements · 91.4% branches · 92.7% functions** (141 tests across 17 test files).

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest (single run) |
| `npm run test:watch` | Vitest (watch mode) |
| `npm run test:coverage` | Vitest + V8 coverage |

## Tech Stack

- **Framework**: Next.js 15 (App Router) · next-intl
- **Database**: SQLite via Prisma ORM
- **Auth**: Custom session-based auth with bcrypt
- **Email**: Resend
- **UI**: shadcn/ui · Tailwind CSS
- **Testing**: Vitest · @vitest/coverage-v8
- **Containerisation**: Docker (multi-stage) · Docker Compose

