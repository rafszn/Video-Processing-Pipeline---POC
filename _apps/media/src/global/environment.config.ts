import { z } from "zod";
import dotenv from "dotenv";
import { loadEnv } from "@core/building-blocks/config";

const envFile = `.env.${process.env.NODE_ENV || "development"}`;
dotenv.config({ path: envFile });

const envSchema = z.object({
  APP_NAME: z.string().default("media"),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().default(5001),

  ALLOWED_INTERNAL_CALLERS: z.string().default("ingress"), //comma seperated string of service names

  /* ---------- cache config ---------- */
  REDIS_URL: z.string().optional(),
  CACHE_DRIVER: z.enum(["redis", "memory"]).default("memory"),

  MONGO_URL: z.string(),

  /* ---------- rabbitmq config ------- */
  RABBITMQ_HOST: z.string().optional(),
  RABBITMQ_VHOST: z.string().optional(),
  RABBITMQ_USERNAME: z.string().optional(),
  RABBITMQ_PASSWORD: z.string().optional(),
  RABBITMQ_PORT: z.coerce.number().optional(),

  /* ---------- r2 storage --------- */
  R2_ACCOUNT_ID: z.string(),
  R2_BUCKET_NAME: z.string(),
  R2_ACCESS_KEY_ID: z.string(),
  R2_PUBLIC_BASE_URL: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
});

const env = loadEnv(envSchema, "media");

export default env;
