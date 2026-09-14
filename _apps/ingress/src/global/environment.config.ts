import { z } from "zod";
import dotenv from "dotenv";
import { loadEnv } from "@core/building-blocks/config";

const envFile = `.env.${process.env.NODE_ENV || "development"}`;
dotenv.config({ path: envFile });

const envSchema = z.object({
  APP_NAME: z.string().default("ingress"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(5000),

  WHITELISTED: z.string().default(""),

  AUTH_SERVICE_URL: z.string().default("http://localhost:5001"),
  USER_SERVICE_URL: z.string().default("http://localhost:5002"),
  MEDIA_SERVICE_URL: z.string().default("http://localhost:5003"),
  PAYMENT_SERVICE_URL: z.string().default("http://localhost:5004"),

  /* ---------- cache config ---------- */
  CACHE_DRIVER: z.enum(["redis", "memory"]).default("memory"),
  REDIS_URL: z.string().optional(),
});

const env = loadEnv(envSchema, "ingress");

export default env;
