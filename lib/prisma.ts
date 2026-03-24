import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

function isLibSqlCompatibleUrl(url: string) {
  return /^(libsql:|wss?:|https?:|file:)/i.test(url);
}

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

  if (!isLibSqlCompatibleUrl(dbUrl)) {
    throw new Error(
      `Unsupported DATABASE_URL for this project: "${dbUrl}". ` +
        "FinanceFrz is configured for SQLite/libSQL URLs only (file:, libsql:, http:, https:, ws:, wss:). " +
        "Use a SQLite URL such as file:./data/prod.db for Docker production."
    );
  }

  const adapter = new PrismaLibSql({ url: dbUrl });
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
