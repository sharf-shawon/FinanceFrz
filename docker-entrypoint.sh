#!/bin/sh
set -eu

# Ensure SQLite schema exists in mounted production volume.
if [ -x ./node_modules/.bin/prisma ]; then
  ./node_modules/.bin/prisma db push --skip-generate
else
  echo "Prisma CLI is not available in the runtime image."
  echo "Expected ./node_modules/.bin/prisma for startup schema sync."
  exit 1
fi

exec node server.js
