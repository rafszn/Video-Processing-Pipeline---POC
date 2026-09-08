import { z } from "zod";
import dotenv from "dotenv";
import { loadEnv } from "@core/building-blocks/config";

const envFile = `.env.${process.env.NODE_ENV || "development"}`;
dotenv.config({ path: envFile });

const envSchema = z.object({
  APP_NAME: z.string().default("auth"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(5001),

  ALLOWED_INTERNAL_CALLERS: z.string().default("ingress"), //comma seperated string pf service names

  /* ---------- cache config ---------- */
  CACHE_DRIVER: z.enum(["redis", "memory"]).default("memory"),
  REDIS_URL: z.string().optional(),
});

const env = loadEnv(envSchema, "ingress");

export default env;
