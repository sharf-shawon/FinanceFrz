/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

function getDatabasePath() {
  const dbUrl = process.env.DATABASE_URL || "file:/app/data/prod.db";

  if (!dbUrl.startsWith("file:")) {
    throw new Error(`Only file: DATABASE_URL is supported, got: ${dbUrl}`);
  }

  const raw = dbUrl.slice("file:".length).split("?")[0];

  if (!raw) {
    throw new Error(`Invalid file: DATABASE_URL, missing path: ${dbUrl}`);
  }

  if (raw.startsWith("/")) {
    return raw;
  }

  return path.resolve(process.cwd(), raw);
}

function getMigrationSqlFiles() {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Missing migrations directory: ${migrationsDir}`);
  }

  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(migrationsDir, entry.name, "migration.sql"))
    .filter((filePath) => fs.existsSync(filePath))
    .sort();
}

function tableInfo(db, tableName) {
  return db.prepare(`PRAGMA table_info("${tableName}")`).all();
}

function hasColumn(db, tableName, columnName) {
  return tableInfo(db, tableName).some((column) => column.name === columnName);
}

function getColumn(db, tableName, columnName) {
  return tableInfo(db, tableName).find((column) => column.name === columnName) || null;
}

function normalizeDefaultValue(value) {
  if (value == null) {
    return null;
  }

  return String(value).replace(/^'+|'+$/g, "").toUpperCase();
}

function ensureTransactionSchema(db) {
  const hasQuantity = hasColumn(db, "Transaction", "quantity");
  const hasRate = hasColumn(db, "Transaction", "rate");
  const categoryColumn = getColumn(db, "Transaction", "categoryId");
  const categoryIsRequired = Boolean(categoryColumn && categoryColumn.notnull === 1);

  if (hasQuantity && hasRate && !categoryIsRequired) {
    return;
  }

  const quantityExpr = hasQuantity ? 'COALESCE("quantity", 1)' : "1";
  const rateExpr = hasRate ? '"rate"' : '"amount"';

  db.exec("PRAGMA defer_foreign_keys=ON;");
  db.exec("PRAGMA foreign_keys=OFF;");

  try {
    db.exec(`
      CREATE TABLE "new_Transaction" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "accountId" TEXT NOT NULL,
        "categoryId" TEXT,
        "type" TEXT NOT NULL,
        "amount" REAL NOT NULL,
        "quantity" REAL NOT NULL DEFAULT 1,
        "rate" REAL,
        "date" DATETIME NOT NULL,
        "description" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    db.exec(`
      INSERT INTO "new_Transaction" (
        "id", "userId", "accountId", "categoryId", "type", "amount", "quantity", "rate", "date", "description", "createdAt", "updatedAt"
      )
      SELECT
        "id",
        "userId",
        "accountId",
        "categoryId",
        "type",
        "amount",
        ${quantityExpr},
        ${rateExpr},
        "date",
        "description",
        "createdAt",
        "updatedAt"
      FROM "Transaction";
    `);

    db.exec("DROP TABLE \"Transaction\";");
    db.exec("ALTER TABLE \"new_Transaction\" RENAME TO \"Transaction\";");
    console.log("[DB INIT] Rebuilt Transaction table to latest schema");
  } finally {
    db.exec("PRAGMA foreign_keys=ON;");
  }
}

function ensureAccountDefaults(db) {
  const currencyColumn = getColumn(db, "Account", "currency");
  const currentDefault = normalizeDefaultValue(currencyColumn ? currencyColumn.dflt_value : null);
  const expectedDefault = "BDT";

  if (currentDefault === expectedDefault) {
    return;
  }

  db.exec("PRAGMA defer_foreign_keys=ON;");
  db.exec("PRAGMA foreign_keys=OFF;");

  try {
    db.exec(`
      CREATE TABLE "new_Account" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'BDT',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    db.exec(`
      INSERT INTO "new_Account" ("id", "userId", "name", "type", "currency", "createdAt", "updatedAt")
      SELECT "id", "userId", "name", "type", "currency", "createdAt", "updatedAt" FROM "Account";
    `);

    db.exec("DROP TABLE \"Account\";");
    db.exec("ALTER TABLE \"new_Account\" RENAME TO \"Account\";");
    console.log("[DB INIT] Updated Account.currency default to BDT");
  } finally {
    db.exec("PRAGMA foreign_keys=ON;");
  }
}

function ensureSchemaUpgrades(db) {
  const transactionTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='Transaction'")
    .get();

  const accountTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='Account'")
    .get();

  if (transactionTable) {
    ensureTransactionSchema(db);
  }

  if (accountTable) {
    ensureAccountDefaults(db);
  }
}

function run() {
  const dbPath = getDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);

  try {
    const userTable = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='User'")
      .get();

    if (!userTable) {
      const migrationFiles = getMigrationSqlFiles();
      if (migrationFiles.length === 0) {
        throw new Error("No migration.sql files found in prisma/migrations");
      }

      for (const filePath of migrationFiles) {
        const sql = fs.readFileSync(filePath, "utf8");
        db.exec(sql);
        console.log(`[DB INIT] Applied ${path.relative(process.cwd(), filePath)}`);
      }

      console.log(`[DB INIT] SQLite schema initialized at ${dbPath}`);
      return;
    }

    console.log(`[DB INIT] Schema already present at ${dbPath}, checking upgrades`);
    ensureSchemaUpgrades(db);
  } finally {
    db.close();
  }
}

run();
