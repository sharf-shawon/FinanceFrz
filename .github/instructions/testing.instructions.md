# Testing Instructions

## Test Framework
Vitest (`vitest`) with `@vitest/coverage-v8`.

## Running Tests
```bash
npm test                  # single run, all tests
npm run test:watch        # watch mode during development
npm run test:coverage     # single run + V8 coverage report
```

Coverage thresholds (enforced in `vitest.config.ts`): **≥ 95%** lines, functions, branches, statements.

---

## File Layout
```
__tests__/
  helpers.ts              — shared test utilities (createTestUser, authHeader, etc.)
  proxy.test.ts           — tests for proxy.ts
  api/
    auth-login.test.ts
    auth-register.test.ts
    auth-me.test.ts
    auth-logout.test.ts
    auth-verify.test.ts
    accounts.test.ts
    accounts-id.test.ts
    categories.test.ts
    categories-id.test.ts
    transactions.test.ts
    transactions-id.test.ts
    daily-logs.test.ts
    analytics.test.ts
    locale.test.ts
  lib/                    — unit tests for lib/* utilities
  pwa/                    — tests for PWA helpers
```

Mirror the source structure: `app/api/foo/route.ts` → `__tests__/api/foo.test.ts`.

---

## Test Patterns

### API route handler test (canonical pattern)
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/resource/route";
import { createTestUser, makeRequest } from "@tests/helpers";

let token: string;
beforeEach(async () => {
  const { token: t } = await createTestUser();
  token = t;
});

describe("GET /api/resource", () => {
  it("returns 401 without auth", async () => {
    const res = await GET(makeRequest("/api/resource"));
    expect(res.status).toBe(401);
  });

  it("returns empty list for new user", async () => {
    const res = await GET(makeRequest("/api/resource", { token }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });
});
```

### Required test cases for every API endpoint
| Scenario | Expected status |
|---|---|
| Missing / invalid auth token | 401 |
| Valid auth, happy path | 200 or 201 |
| Invalid input / missing required field | 400 |
| Resource not found | 404 |
| Trying to access another user's resource | 404 (not 403, to avoid leaking existence) |

### Unit test (pure function)
```typescript
import { describe, it, expect } from "vitest";
import { myHelper } from "@/lib/utils";

describe("myHelper", () => {
  it("handles the base case", () => {
    expect(myHelper(0)).toBe(0);
  });
});
```

---

## Coverage Rules
1. The **enforced minimum** (via `vitest.config.ts` thresholds) is **95%** overall.
2. Aim for **≈ 98% coverage on new or modified code paths** — the 95% floor is a safety net, not a target.
3. If a branch cannot be tested, add `/* v8 ignore next */` comment with a justification.
3. Run `npm run test:coverage` and check the `coverage/` HTML report before committing.
4. Never reduce overall coverage below the enforced thresholds.

---

## Test Helpers (`__tests__/helpers.ts`)
- `createTestUser(overrides?)` — creates a `User` + `UserSession` in the test DB, returns `{ user, token }`.
- `authHeader(token)` — returns `{ Authorization: "Bearer <token>" }`.
- `makeRequest(url, opts?)` — constructs a `NextRequest` for use in route handler tests.
- `createTestAccount(userId, overrides?)` — creates an `Account`.
- `createTestCategory(userId, overrides?)` — creates a `Category`.

Check `__tests__/helpers.ts` for the exact signatures and available helpers.
