# Code Style Instructions

## Language and Runtime
- **TypeScript** (strict mode via `tsconfig.json`) throughout the entire codebase.
- Target: ES2017+ (Node.js ≥ 20).
- No JavaScript files in `app/`, `lib/`, or `components/` — use `.ts` / `.tsx` only.

---

## Linting
```bash
npm run lint           # ESLint with eslint-config-next
npx tsc --noEmit       # TypeScript type-check
```

Config file: `eslint.config.mjs` (flat config format).

### ESLint rules of note
- `@typescript-eslint/no-unused-vars` — warning; prefix intentionally unused params with `_` (e.g., `_req`).
- No `any` types except in tests or generated code.
- React hooks rules enforced via `eslint-config-next`.

---

## Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Files (routes/pages) | kebab-case | `daily-logs/page.tsx` |
| Files (utilities) | camelCase | `lib/utils.ts` |
| React components | PascalCase | `TransactionTable.tsx` |
| Variables / functions | camelCase | `getAuthUser`, `createTransaction` |
| Prisma models | PascalCase | `User`, `Transaction` |
| Database columns | camelCase in schema | `passwordHash`, `createdAt` |
| Constants | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE = 100` |
| Private/internal helpers | prefix with `_` or keep in module scope | |

---

## Import Conventions
- Use the `@/` alias for all project-local imports (configured in `tsconfig.json`).
- Relative imports only within the same directory.
- Import order (enforced conceptually): built-ins → node_modules → `@/lib` → `@/components` → local.

```typescript
// Good
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
```

---

## Next.js App Router Conventions

- **Server Components** by default; add `"use client"` only when you need browser APIs or React hooks.
- **Route handlers** live in `app/api/<resource>/route.ts` — export named functions `GET`, `POST`, `PUT`, `DELETE`, `PATCH`.
- **Protected routes**: call `getAuthUser(request)` at the top; return 401 immediately if null.
- **Error responses**: always return structured JSON `{ error: "message" }` with the appropriate HTTP status code.
- **No `pages/api/`** — this project uses the App Router exclusively.

---

## Database / Prisma Conventions

- Import Prisma client from `@/lib/prisma` (singleton, never instantiate `PrismaClient` elsewhere).
- Every query must be scoped to the authenticated user: `where: { userId: user.id }`.
- Use Prisma's `select` to return only necessary fields (avoid over-fetching).
- Migrations: `npx prisma migrate dev --name <descriptive-name>`.
- Do **not** hand-edit files in `prisma/migrations/` after they are applied.

---

## Component Conventions

- UI primitives come from `shadcn/ui` (Radix UI + Tailwind) — check `components/ui/` before building custom UI.
- Compose existing components; avoid duplicating UI logic.
- Keep components small and focused; extract sub-components when a file exceeds ~150 lines.
- Use `cn()` from `@/lib/utils` for conditional class merging (Tailwind).

---

## Forbidden Patterns

- ❌ `console.log` in production code (use error boundaries or server logs).
- ❌ Hardcoded credentials or secrets.
- ❌ Direct DOM manipulation (use React state/refs).
- ❌ `eval()` or `Function()` constructor.
- ❌ Importing from `app/generated/prisma/` directly — always use `@/lib/prisma`.
- ❌ Skipping auth checks in API handlers.
- ❌ Missing `userId` scope in database queries.
