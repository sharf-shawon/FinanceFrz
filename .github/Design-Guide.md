# FinanceFrz Design Guide

## 1. High-level Architecture

FinanceFrz is a **monolithic Next.js 16 (App Router) application** with no separate backend service.

```
Browser
  │
  ▼
Next.js App (App Router)
  ├── app/(auth)/          — Login, Register, Verify-Email pages (server components + client forms)
  ├── app/(dashboard)/     — Protected dashboard pages (server components + client charts/tables)
  ├── app/api/             — REST-style JSON API route handlers (Next.js route.ts files)
  │     ├── auth/          — login, logout, register, verify, me
  │     ├── accounts/      — CRUD for bank/cash accounts
  │     ├── categories/    — CRUD for income/expense categories
  │     ├── transactions/  — CRUD for financial transactions
  │     ├── daily-logs/    — Quantity × rate daily expense logs
  │     ├── analytics/     — Aggregated analytics queries
  │     └── locale/        — User locale preference updates
  ├── lib/                 — Shared server-side utilities
  │     ├── auth.ts        — Session management, getAuthUser()
  │     ├── email.ts       — Resend email wrapper
  │     ├── prisma.ts      — Singleton Prisma client
  │     └── utils.ts       — Shared helpers
  ├── components/          — React UI components (shadcn/ui + custom)
  ├── prisma/              — Prisma schema + migration SQL files
  └── messages/            — i18n JSON translation files
```

All API calls from the browser go to the same Next.js process. There are no microservices.

### External dependencies
| Service | Purpose |
|---|---|
| **SQLite** (file-based) | Primary data store, managed via Prisma |
| **Resend** | Transactional email (verification emails) |
| **next-auth** (beta) | OAuth adapter scaffolding (not fully used) |

---

## 2. Data Model and Domain

Core Prisma models (`prisma/schema.prisma`):

```
User ──< UserSession            (many sessions per user)
User ──< VerificationToken      (for email verification flow)
User ──< Account                (bank/cash accounts)
User ──< Category               (income/expense categories)
User ──< Transaction            (all financial entries)
Account ──< Transaction
Category ──< Transaction (nullable)
```

### Key entities

| Model | Key fields | Notes |
|---|---|---|
| `User` | `id`, `email`, `passwordHash`, `emailVerifiedAt`, `locale`, `themePreference` | All data is scoped to a user |
| `Account` | `name`, `type` (e.g. `bank`, `cash`, `wallet`), `currency` | Transactions belong to an account |
| `Category` | `name`, `type` (`income`/`expense`), `color` | Optional; transactions may be uncategorised |
| `Transaction` | `type` (`income`/`expense`), `amount`, `quantity`, `rate`, `date`, `description` | `amount = quantity × rate` for daily-log entries |
| `UserSession` | `token`, `expiresAt` | Bearer token auth; checked on every protected request |

### Important invariants
- **User isolation**: every query must include `WHERE userId = <current_user_id>`. A missing `userId` filter is a security bug.
- `Transaction.amount` stores the final value; `quantity` and `rate` are optional metadata for daily-log-style entries.
- `emailVerifiedAt` must be non-null for a user to access protected pages.
- Session tokens must be checked for expiry (compared against `expiresAt`).

---

## 3. Control and Data Flows

### Typical API request path
```
Browser fetch()
  → Next.js route handler  (app/api/<resource>/route.ts)
      → getAuthUser(request)   — reads Authorization header, validates session token in DB
      → validate input         — Zod schema parse or manual checks
      → prisma.<model>.<op>()  — always scoped by userId
      → return NextResponse.json(data)
```

### Authentication flow
1. `POST /api/auth/register` → hash password → create `User` + `VerificationToken` → send verification email via Resend.
2. `GET /api/auth/verify?token=…` → find `VerificationToken`, set `emailVerifiedAt`, delete token.
3. `POST /api/auth/login` → verify password → create `UserSession` (token = `cuid()`, 7-day expiry) → return token.
4. Subsequent requests → `Authorization: Bearer <token>` header → `getAuthUser()` in `lib/auth.ts` validates token + expiry.
5. `POST /api/auth/logout` → delete `UserSession` row.

### Daily-logs flow
- Transactions created via `/api/daily-logs` use `quantity` × `rate` = `amount`.
- They appear in the main `/api/transactions` list as regular transactions.

### Analytics flow
- `/api/analytics` runs Prisma aggregation queries grouped by category/account/month.
- Results are returned as JSON; the dashboard page renders charts with Recharts.

---

## 4. Extension Points and Patterns

### Adding a new resource (e.g., `Budget`)

1. **Schema**: add the Prisma model to `prisma/schema.prisma` with a `userId` foreign key. Run `npx prisma migrate dev --name add-budget`.
2. **API**: create `app/api/budgets/route.ts` (GET list + POST create) and `app/api/budgets/[id]/route.ts` (GET one + PUT update + DELETE).
3. **Auth guard**: call `getAuthUser(request)` at the top of every handler; return 401 if null.
4. **Scoping**: include `userId` in every `prisma.budget.findMany({ where: { userId } })` call.
5. **Validation**: parse request body with a Zod schema before hitting the database.
6. **Page**: add a new route under `app/(dashboard)/budgets/page.tsx` using `fetch("/api/budgets")`.
7. **Tests**: add `__tests__/api/budgets.test.ts` and `__tests__/api/budgets-id.test.ts`.

### Route handler template
```typescript
// app/api/budgets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const budgets = await prisma.budget.findMany({ where: { userId: user.id } });
  return NextResponse.json(budgets);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  // validate with Zod...
  const budget = await prisma.budget.create({ data: { ...body, userId: user.id } });
  return NextResponse.json(budget, { status: 201 });
}
```

### Useful patterns from existing code
- See `app/api/transactions/route.ts` for pagination, date-range filtering, and Zod validation.
- See `app/api/analytics/route.ts` for Prisma aggregation (`groupBy`, `_sum`).
- See `__tests__/helpers.ts` for test setup helpers (`createTestUser`, `authHeader`, `createTestAccount`).

---

## 5. Testing Strategy

### What to test at which level

| Level | When to use | Example |
|---|---|---|
| **Unit** | Pure functions with no DB/IO | `lib/utils.ts` date helpers |
| **API integration** | Route handlers using in-memory DB | All `app/api/**` handlers |
| **Proxy** | `proxy.ts` reverse-proxy logic | `__tests__/proxy.test.ts` |

### Test setup pattern (API tests)
```typescript
// __tests__/api/budgets.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createTestUser, authHeader } from "@tests/helpers";
import { GET, POST } from "@/app/api/budgets/route";
import { makeRequest } from "@tests/helpers";

let authToken: string;
beforeEach(async () => {
  const { token } = await createTestUser();
  authToken = token;
});

it("returns 401 without auth", async () => {
  const res = await GET(makeRequest("/api/budgets"));
  expect(res.status).toBe(401);
});

it("creates and retrieves a budget", async () => {
  const create = await POST(makeRequest("/api/budgets", {
    method: "POST",
    body: { name: "Groceries", amount: 500 },
    token: authToken,
  }));
  expect(create.status).toBe(201);
  // ...
});
```

Look at `__tests__/api/accounts.test.ts` for the canonical example.

### Coverage target
- ≥ 95% overall (enforced by `vitest.config.ts` thresholds).
- Aim for ≈ 98% on new code paths.
- All happy paths and error branches (missing auth, invalid input, not-found) must be tested.
