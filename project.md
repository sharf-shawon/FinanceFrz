---
title: "FinanceFrz"
date: 2026-04-08
repo: "https://github.com/sharf-shawon/FinanceFrz"
deployment: "https://frz.dhakaiya.dev"
tags: ["nextjs", "typescript", "sqlite", "prisma", "tailwindcss", "docker", "vitest", "shadcn-ui"]
cover: "img/financefrz-cover.png"
summary: "A self-hosted personal finance app for tracking transactions, accounts, and daily expenses with analytics."
---

## Overview

FinanceFrz is a full-stack personal finance application built for a single user (or small household) who wants full ownership of their data. It solves the problem of needing a capable yet self-hostable finance tracker — no third-party data sharing, no subscription fees. Users can manage accounts, categorise income and expenses, log daily quantity-based purchases, and review spending trends through an analytics dashboard.

## Features

- Account management (bank, cash, wallet) with multi-currency support
- Income and expense transaction tracking with category tagging
- Daily-log mode: enter quantity × rate entries for repetitive purchases
- Analytics dashboard with charts for spending by category, account, and month
- Email verification on registration; session-based authentication
- Dark/light/system theme preference per user
- Multi-locale support (next-intl)
- PDF export for daily expense logs

## Technical Stack

**Framework**: Next.js 16 (App Router) with TypeScript, running as a monolithic server — no separate API service.

**Database**: SQLite via Prisma ORM (supports libSQL for edge deployments). Schema covers `User`, `Account`, `Category`, `Transaction`, `UserSession`, and `VerificationToken` models.

**Auth**: Custom session-based authentication using `bcryptjs` (≥ 10 salt rounds) and `cuid()`-generated bearer tokens stored in the database with a 7-day expiry.

**Email**: Transactional email through Resend for account verification flows.

**UI**: shadcn/ui (Radix UI primitives) + Tailwind CSS v4; Recharts for data visualisation; TanStack Table for sortable/filterable transaction grids.

**Testing**: Vitest with `@vitest/coverage-v8` — 234 tests across 19 files, achieving 100% statement coverage and 98.9% branch coverage.

**Containerisation**: Multi-stage Dockerfile targeting `linux/amd64` and `linux/arm64`; Docker Compose files for both development and production.

## Challenges & Solutions

**User data isolation at scale**: Every Prisma query must be scoped to the authenticated user's `id`. A helper function `getAuthUser()` centralises session validation, and a strict code-review rule enforces the `userId` filter on every query. This prevents cross-user data leaks without adding a separate authorisation layer.

**Quantity × rate transactions**: The daily-log feature required storing optional `quantity` and `rate` metadata alongside the computed `amount`. Rather than a separate model, these fields were added to `Transaction` with a default `quantity` of 1, keeping the schema simple while supporting both standard and unit-based entries in the same list.

## Automation & DevOps

GitHub Actions runs two workflows: a **CI pipeline** on every push and pull request (lint → TypeScript type-check → Vitest coverage, enforcing ≥ 95% thresholds), and a **Docker build-and-push workflow** triggered on version tags. Docker images are published to the GitHub Container Registry (`ghcr.io`) for both `amd64` and `arm64` architectures via QEMU/Buildx. On successful tag builds, a Coolify webhook triggers an automatic redeployment of the production container.

Pre-commit hooks (via `pre-commit`) enforce trailing-whitespace cleanup, YAML/JSON validity, ESLint, and TypeScript checks before every local commit.

## Status & Future Improvements

Currently in active development (v0.1.x), self-hosted in production. Potential next steps include:

- Budget limits per category with over-budget alerts
- Recurring transaction scheduling
- CSV/OFX import for bulk transaction entry
- Grafana or embedded analytics for longer-term trend visualisation
- OAuth login (next-auth adapter already scaffolded)

## Links

- **Repository:** [https://github.com/sharf-shawon/FinanceFrz](https://github.com/sharf-shawon/FinanceFrz)
- **Live Demo:** [https://frz.dhakaiya.dev](https://frz.dhakaiya.dev)
