import { z } from "zod";
import dotenv from "dotenv";
import { loadEnv } from "@core/building-blocks/config";

const envFile = `.env.${process.env.NODE_ENV || "development"}`;
dotenv.config({ path: envFile });

const envSchema = z.object({
  WHITELISTED: z.string().default(""),
  PORT: z.coerce.number().default(5000),
  APP_NAME: z.string().default("ingress"),
  NODE_ENV: z.enum(["development", "production"]).default("development"),

  /* ---------- services urls --------- */
  MEDIA_SERVICE_URL: z.string().default("http://localhost:5001"),

  /* ---------- cache config ---------- */
  REDIS_URL: z.string().optional(),
  CACHE_DRIVER: z.enum(["redis", "memory"]).default("memory"),
});

const env = loadEnv(envSchema, "ingress");

export default env;
