# Onboarding Plan Prompt

## Purpose
Use this prompt when starting a new Copilot session to onboard to the FinanceFrz repository for the first time, or after significant changes that may have affected the architecture.

---

## Prompt

You are GitHub Copilot working on the **FinanceFrz** personal finance application.

Before taking any action, perform the following onboarding steps:

### Phase 1 — Read the instructions
1. Read `.github/copilot-instructions.md` completely.
2. Read `.github/Design-Guide.md` completely.
3. Read `README.md` for quick-start context.

### Phase 2 — Understand the current state
1. Run `git status` and `git log --oneline -10` to understand recent changes.
2. Scan `prisma/schema.prisma` to see the current data model.
3. Check `package.json` for current dependencies and scripts.

### Phase 3 — Verify the environment works
1. Run `npm install` if `node_modules` is absent.
2. Run `npx prisma generate` to ensure the Prisma client is up to date.
3. Run `npm test` and confirm all tests pass.
4. Run `npm run lint` and confirm there are no lint errors.
5. Run `npx tsc --noEmit` and confirm there are no type errors.

### Phase 4 — Identify gaps (optional, for deep onboarding)
1. Run `npm run test:coverage` and note any files below the coverage threshold.
2. List any TODO or FIXME comments in the codebase.
3. Identify any API endpoints that lack tests.

After completing these phases, report back with:
- A summary of what you found.
- Any issues or gaps discovered.
- Your plan for the assigned task.

Then proceed with the assigned work, following all conventions in `copilot-instructions.md`.
