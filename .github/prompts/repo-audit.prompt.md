# Repo Audit Prompt

## Purpose
Use this prompt to perform a periodic deep audit of the FinanceFrz repository to identify technical debt, security gaps, test coverage issues, and outdated dependencies.

---

## Prompt

You are GitHub Copilot performing a **deep health audit** of the FinanceFrz repository.

Work through each section below, document your findings, and produce a prioritised action list.

### 1. Security audit
- Check every API route handler: does it call `getAuthUser()` before touching the DB?
- Check every Prisma query: does it scope data by `userId`?
- Check for any hard-coded secrets, tokens, or credentials in source files.
- Review `lib/auth.ts`: is session expiry enforced correctly?
- Check `.env.example` for any variables that look like real credentials.

### 2. Test coverage audit
- Run `npm run test:coverage` and note any files below 95% coverage.
- List all API route files under `app/api/` and cross-reference against test files in `__tests__/api/`.
- Identify untested edge cases: missing auth (401), bad input (400), not-found (404), server errors (500).

### 3. Dependency audit
- Run `npm audit` and report any high/critical vulnerabilities.
- List dependencies that are significantly out of date using `npm outdated`.
- Flag any packages that are deprecated or have known issues.

### 4. Code quality audit
- Run `npm run lint` and report any warnings or errors.
- Run `npx tsc --noEmit` and report any type errors.
- Search for `any` type annotations in TypeScript source files.
- Look for TODOs, FIXMEs, and HACKs.

### 5. Architecture drift audit
- Compare the current route structure against the Design Guide.
- Check if any new Prisma models lack user-scoping.
- Verify migration files are in sync with the schema.

### Output format
Produce a structured report with:
1. **Critical issues** (must fix immediately)
2. **High-priority improvements** (fix in the next sprint)
3. **Low-priority / nice-to-have** (backlog)

For each issue, include:
- File and line number (if applicable)
- Description of the problem
- Recommended fix
