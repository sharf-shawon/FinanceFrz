# Security Instructions

## Core Principles
1. **Never commit secrets** — no API keys, tokens, passwords, or connection strings in source code.
2. **User data isolation** — every database query must be scoped to the authenticated user.
3. **Defense in depth** — authenticate, authorise, then validate input on every request.

---

## Authentication & Session Management

- **Session tokens** are generated via `cuid()`, stored in `UserSession`, and expire after 7 days.
- `getAuthUser(request: NextRequest)` in `lib/auth.ts` is the canonical auth check:
  1. Reads `Authorization: Bearer <token>` header.
  2. Looks up `UserSession` where `token = …` AND `expiresAt > now`.
  3. Returns the associated `User` or `null`.
- **Always** call `getAuthUser()` at the top of every protected route handler.
- Return `401` immediately if `getAuthUser()` returns `null` — do not proceed.

```typescript
// Required pattern in every protected handler
const user = await getAuthUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

---

## User Data Scoping

**Every** Prisma query on user-owned data must include `userId`:

```typescript
// ✅ Correct
await prisma.transaction.findMany({ where: { userId: user.id, id: params.id } });

// ❌ Wrong — leaks data across users
await prisma.transaction.findUnique({ where: { id: params.id } });
```

Failing to scope queries is a **critical security vulnerability**.
When returning a 404 for a resource not found, do **not** distinguish between "not found" and "belongs to another user" — both should return 404 to avoid leaking existence.

---

## Password Handling

- Passwords are hashed with `bcryptjs` at **≥ 10 salt rounds** before storage.
- **Never** store, log, or transmit plain-text passwords.
- **Never** return `passwordHash` in API responses.
- Use `bcrypt.compare()` for verification; never do string comparison.

---

## Input Validation

- Parse and validate all request bodies before touching the database.
- Use **Zod schemas** for structured validation.
- Reject unexpected fields (use `z.object({}).strict()` where appropriate).
- Validate numeric ranges, string lengths, and enum values.
- Never trust client-supplied `userId` — always use the authenticated user's ID from `getAuthUser()`.

---

## Environment Variables & Secrets

| Variable | Description | Never commit |
|---|---|---|
| `DATABASE_URL` | SQLite file path or libSQL URL | ✅ |
| `AUTH_SECRET` | JWT / session signing secret | ✅ |
| `RESEND_API_KEY` | Transactional email API key | ✅ |
| `DATABASE_URL_PROD` | Production DB URL | ✅ |

- All secrets live in `.env` (git-ignored).
- Add new required vars to `.env.example` with a placeholder value and a comment.
- Never add real values to `.env.example`.

---

## Email Verification

- New accounts require email verification before accessing the dashboard.
- Verification tokens expire (check `expiresAt`); reject expired tokens.
- Tokens are one-time use — delete after successful verification.

---

## HTTP Security Conventions

- Use `NextResponse.json()` with explicit status codes — never implicit 200 for errors.
- Do not expose internal error messages to clients (log them server-side, return a generic message).
- No CORS headers should be set unless explicitly required (Next.js handles same-origin by default).

---

## Dangerous / Restricted Areas

| Area | Risk | Rule |
|---|---|---|
| `prisma/migrations/` | Irreversible schema changes | Read-only; add new migrations only |
| `lib/auth.ts` | Core auth logic | Change only with explicit instruction and full test coverage |
| `lib/prisma.ts` | DB connection singleton | Do not modify adapter settings without explicit instruction |
| `.env` | Secrets | Never commit; never log |
| `docker-compose.prod.yml` | Production infrastructure | Read-only; treat as infra config |

---

## Security Checklist (before every PR)

- [ ] All new API handlers call `getAuthUser()` and return 401 if unauthenticated.
- [ ] All Prisma queries on user data include `userId` scope.
- [ ] No secrets, tokens, or credentials added to source code.
- [ ] Input validated with Zod before database operations.
- [ ] `passwordHash` is never returned in API responses.
- [ ] Tests cover the 401 unauthenticated case for every new endpoint.
