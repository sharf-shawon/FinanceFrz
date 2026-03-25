# FinanceFrz

<p align="center">
  <img src="public/icons/apple-icon.png" alt="FinanceFrz Logo" width="80" height="80" />
</p>

<p align="center">
  <img src="public/og-image.png" alt="FinanceFrz Banner" width="800" />
</p>

[![CI](https://github.com/sharf-shawon/FinanceFrz/actions/workflows/ci.yml/badge.svg)](https://github.com/sharf-shawon/FinanceFrz/actions/workflows/ci.yml)
[![Docker](https://github.com/sharf-shawon/FinanceFrz/actions/workflows/docker.yml/badge.svg)](https://github.com/sharf-shawon/FinanceFrz/actions/workflows/docker.yml)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/sharf-shawon/FinanceFrz/actions/workflows/ci.yml)

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
On container startup, the app initializes SQLite schema from `prisma/migrations` automatically.

## Testing

```bash
# Run all tests
npm test

# Run with watch mode
npm run test:watch

# Run with coverage report (enforces ≥95% thresholds)
npm run test:coverage
```

**Current coverage: 100% statements · 98.9% branches · 100% functions** (234 tests across 19 test files).

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

- **Framework**: Next.js 16 (App Router) · next-intl
- **Database**: SQLite via Prisma ORM
- **Auth**: Custom session-based auth with bcrypt
- **Email**: Resend
- **UI**: shadcn/ui · Tailwind CSS
- **Testing**: Vitest · @vitest/coverage-v8
- **Containerisation**: Docker (multi-stage) · Docker Compose

