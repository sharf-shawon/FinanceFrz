# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 – deps: install production + dev dependencies (cached layer)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS deps
WORKDIR /app

# Copy manifests first to maximise cache reuse
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 – test: run the full Vitest suite with coverage
# ─────────────────────────────────────────────────────────────────────────────
FROM deps AS test
WORKDIR /app
COPY . .
# Generate Prisma client (needed for type-checking in test files)
RUN npx prisma generate
RUN npm run test:coverage

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 – builder: Next.js standalone production build
#            (only runs when tests pass in the previous stage)
# ─────────────────────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 4 – runner: minimal production image
# ─────────────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Ensure SQLite database directory exists and is writable by runtime user.
RUN mkdir -p /app/data \
 && chown -R nextjs:nodejs /app

# Copy only the standalone output and static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma needs the schema + migrations at runtime for `prisma migrate deploy`
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/app/generated ./app/generated
COPY --from=builder --chown=nextjs:nodejs /app/init-sqlite.js ./init-sqlite.js

COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./docker-entrypoint.sh"]
