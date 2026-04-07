import { prisma } from "./prisma-client.js";
import { env } from "../../config/env.js";
import { logger } from "../logging/logger.js";

const isSqlite = env.DATABASE_URL.startsWith("file:");

export const initializeDatabaseRuntime = async (): Promise<void> => {
  if (!isSqlite) {
    return;
  }

  await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
  await prisma.$queryRawUnsafe("PRAGMA foreign_keys = ON;");
  await prisma.$queryRawUnsafe("PRAGMA case_sensitive_like = OFF;");

  logger.info("SQLite runtime pragmas applied", {
    journalMode: "WAL",
    foreignKeys: true,
    caseSensitiveLike: false,
  });
};

export const checkDatabaseConnection = async (): Promise<void> => {
  await prisma.$queryRaw`SELECT 1`;
};
