-- Add quantity and rate to Transaction for unit-rate based daily logs
ALTER TABLE "Transaction" ADD COLUMN "quantity" REAL NOT NULL DEFAULT 1;
ALTER TABLE "Transaction" ADD COLUMN "rate" REAL;
