# Copilot Instructions for FinanceFrz

## Project Overview

FinanceFrz is a personal finance web application built with **Next.js 16 (App Router)** and **TypeScript**. It enables users to track transactions, manage accounts and categories, view analytics, and maintain daily expense logs. The app features session-based authentication (bcrypt), email verification via Resend, multi-locale support (next-intl), and a Radix UI / shadcn/ui component library styled with Tailwind CSS.

The backend is a set of Next.js API route handlers that communicate with a **SQLite database** through **Prisma ORM**. The entire stack runs in a single Next.js process and can be deployed as a Docker container.

---

## Build & Run

### Prerequisites
- Node.js ≥ 20 and npm
- `cp .env.example .env` — fill in `DATABASE_URL`, `AUTH_SECRET`, `RESEND_API_KEY`, and other required vars.

### Local (plain Node)
```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm run dev          # starts http://localhost:3000
```

### Local (Docker Compose)
```bash
cp .env.example .env
docker compose up
```

### Production (Docker Compose)
```bash
cp .env.example .env   # fill in all secrets, set DATABASE_URL_PROD
docker compose -f docker-compose.prod.yml up -d
```

### Key npm scripts
| Script | Purpose |
|---|---|
| `npm run dev` | Development server (auto-migrates & generates Prisma client) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | TypeScript type-check |
| `npm test` | Vitest (single run) |
| `npm run test:watch` | Vitest (watch mode) |
| `npm run test:coverage` | Vitest + V8 coverage report |

---

## Testing & Coverage

### Test framework
[Vitest](https://vitest.dev/) with `@vitest/coverage-v8`.

### Canonical commands
```bash
npm test                 # all tests, single run
npm run test:coverage    # tests + coverage report (enforces ≥95% thresholds)
```

Coverage is enforced via `vitest.config.ts` thresholds (lines, functions, branches, statements all ≥ 95%).

### Rules
- **Any new or changed code must be accompanied by tests.**
- Aim for **≈98% coverage on new code paths**; never decrease overall coverage where practical.
- If a branch genuinely cannot be tested (e.g., a dead default case), document it with a comment.
- Tests live in `__tests__/` mirroring `app/api/` and `lib/` paths.

### Test layers
| Layer | Location | What to test |
|---|---|---|
| **Unit** | `__tests__/lib/` | Pure utility functions, `lib/utils.ts`, `lib/auth.ts` helpers |
| **API / Integration** | `__tests__/api/` | Next.js route handlers with a real in-memory SQLite DB via Prisma |
| **Proxy** | `__tests__/proxy.test.ts` | `proxy.ts` reverse-proxy helper |
| **PWA** | `__tests__/pwa/` | Service-worker and PWA manifest helpers |

Look at `__tests__/api/accounts.test.ts` or `__tests__/api/transactions.test.ts` for well-structured examples.

---

## Code Style, Linting, and Formatting

### Tools
| Tool | Config file | Command |
|---|---|---|
| **ESLint** | `eslint.config.mjs` | `npm run lint` |
| **TypeScript** | `tsconfig.json` | `npx tsc --noEmit` |

There is no separate Prettier config — ESLint enforces style consistency.

### Important conventions
- **File names**: kebab-case for components and routes (Next.js convention).
- **Imports**: Use the `@/` alias to reference project root.
- **Unused params**: Prefix with `_` (e.g., `_req`) — ESLint is configured to allow this.
- **API routes**: All handlers live under `app/api/<resource>/route.ts`; no `pages/api/`.
- **Auth guard**: Use `getAuthUser()` from `lib/auth.ts` at the top of every protected route handler.
- **Prisma client**: Import from `lib/prisma.ts` — never instantiate `PrismaClient` directly in route files.
- **Never** commit generated files (`app/generated/prisma/`) — they are re-generated at build time.
- **No secrets** in source code. Use environment variables.

---

## Conventional Commits

**All non-system commits by Copilot must follow [Conventional Commits](https://www.conventionalcommits.org/):**

```
feat: add budget category limit tracking
fix: correct off-by-one error in analytics date range
chore: configure pre-commit hooks
docs: document API authentication flow
refactor: extract pagination helper to lib/utils.ts
test: add coverage for daily-logs DELETE handler
```

### Rules for Copilot
1. Derive commit messages from the staged diff — be specific about what changed.
2. Keep commits **small and logically grouped** (one concern per commit).
3. Separate doc changes, config changes, and code changes into distinct commits where practical.
4. Do **not** rewrite history; use incremental commits.

---

## Pre-commit Hooks

Config lives at **`.pre-commit-config.yaml`** in the project root.

### Install & run
```bash
pip install pre-commit        # once per machine
pre-commit install            # installs git hooks
pre-commit run --all-files    # run all hooks on all files manually
```

### Rule
**Before every commit, run pre-commit hooks and fix all failures until they pass.**

The hooks run:
- `trailing-whitespace`, `end-of-file-fixer`, `check-yaml`, `check-json`, `check-merge-conflict`
- ESLint on `*.ts` / `*.tsx` / `*.mjs` files
- TypeScript `--noEmit` check

---

## Security & Safety

- **Never commit secrets**, API keys, or credentials. Always use `.env` (which is git-ignored).
- Refer to `.env.example` for the list of required environment variables.
- Session tokens are stored in `UserSession` table; always verify expiry in `getAuthUser()`.
- Passwords are hashed with `bcryptjs` (salt rounds ≥ 10) — never store plain-text passwords.
- User-scoped queries: every database query **must** include `userId` as a filter to prevent cross-user data leaks.
- **Do not modify** Prisma migration files after they have been applied to a production database.
- Do not modify `.env.example` to contain real values.

---

## Non-goals and Dangerous Areas

| Path / Area | Guidance |
|---|---|
| `prisma/migrations/` | **Read-only** unless explicitly told to add a migration. Never edit existing migration SQL. |
| `app/generated/prisma/` | **Never touch** — auto-generated by `prisma generate`. |
| `.env` | Never commit; add new vars to `.env.example` instead. |
| `docker-compose.prod.yml` | Treat as read-only; changes affect production deployments. |
| `lib/prisma.ts` | Only instantiates the Prisma client. Change only if the DB adapter changes. |
| `i18n.ts` / `messages/` | Locale config — add new translation keys carefully; missing keys break the build. |

---

## .github/ File Organization

```
.github/
  copilot-instructions.md         # This file — primary instructions for Copilot
  Design-Guide.md                 # Architecture, domain model, and design patterns
  prompts/
    onboarding-plan.prompt.md     # Phased onboarding prompt for new agents
    repo-audit.prompt.md          # Deep audit prompt for periodic reviews
  instructions/
    testing.instructions.md       # Focused testing rules and examples
    code-style.instructions.md    # Style details and naming conventions
    security.instructions.md      # Security-focused rules and checklists
```

### When to consult each file
- **Start every session** by reading `copilot-instructions.md` (this file).
- **Before adding a feature**: read `Design-Guide.md` to understand architecture and patterns.
- **Before writing tests**: read `instructions/testing.instructions.md`.
- **Before committing**: run pre-commit hooks; commit with Conventional Commits.
- **Security-sensitive work**: read `instructions/security.instructions.md`.
- **For a repo health check**: use `prompts/repo-audit.prompt.md`.
