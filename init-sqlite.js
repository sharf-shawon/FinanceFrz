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

function run() {
  const dbPath = getDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);

  try {
    const userTable = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='User'")
      .get();

    if (userTable) {
      console.log(`[DB INIT] Schema already present at ${dbPath}`);
      return;
    }

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
  } finally {
    db.close();
  }
}

run();
