import { Redis } from "ioredis";
import { logger } from "../Logger/winstonLogger.js";

export interface CreateRedisClientConfig {
  redisUrl: string;
}

export function createRedisClient(
  config: CreateRedisClientConfig,
): Redis | null {
  if (!config.redisUrl) {
    logger.warn("[Redis] redisUrl is not set. Redis client was not created.");
    return null;
  }

  const redis = new Redis(config.redisUrl, {
    lazyConnect: true,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
  });

  redis.on("connect", () => {
    logger.info("[Redis] Connected.");
  });

  redis.on("ready", () => {
    logger.info("[Redis] Ready.");
  });

  redis.on("error", (error) => {
    logger.error("[Redis] Error:", error.message);
  });

  redis.on("close", () => {
    logger.warn("[Redis] Connection closed.");
  });

  return redis;
}
