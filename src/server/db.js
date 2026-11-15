import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

export const databaseConfigured = Boolean(process.env.DATABASE_URL);

const globalForPrisma = globalThis;
function createClient() {
  if (!databaseConfigured) return null;
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.cutCatchDb ?? createClient();
if (process.env.NODE_ENV !== "production" && db) globalForPrisma.cutCatchDb = db;
