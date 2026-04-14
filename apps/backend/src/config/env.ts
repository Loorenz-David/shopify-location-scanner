import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  FRONTEND_URLS: z.string().optional(),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  ADMIN_KEY: z.string().min(1).optional(),
  SHOPIFY_API_KEY: z.string().min(1),
  SHOPIFY_API_SECRET: z.string().min(1),
  SHOPIFY_SCOPES: z.string().min(1),
  SHOPIFY_APP_URL: z.string().url(),
  BACKEND_PUBLIC_URL: z.string().url().optional(),
  SHOPIFY_API_VERSION: z.string().min(1).default("2025-10"),
  SHOPIFY_METAFIELD_NAMESPACE: z.string().min(1).default("app"),
  SHOPIFY_METAFIELD_KEY: z.string().min(1).default("item_location"),
  REDIS_URL: z.string().url().default("redis://127.0.0.1:6379"),
});

export const env = EnvSchema.parse(process.env);
export const backendPublicUrl = env.BACKEND_PUBLIC_URL ?? env.SHOPIFY_APP_URL;

const isRelativeSqlitePath = (databaseUrl: string): boolean => {
  if (!databaseUrl.startsWith("file:")) {
    return false;
  }

  return !databaseUrl.startsWith("file:/");
};

if (env.NODE_ENV === "production" && isRelativeSqlitePath(env.DATABASE_URL)) {
  throw new Error(
    "In production, DATABASE_URL for SQLite must use an absolute path (example: file:/var/lib/item-scanner/data/app.db).",
  );
}
