#!/bin/sh
set -eu

# Ensure SQLite schema exists in mounted production volume.
node ./init-sqlite.js

exec node server.js
