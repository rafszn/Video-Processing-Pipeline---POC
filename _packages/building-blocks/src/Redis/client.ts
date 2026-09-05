import { Redis } from "ioredis";

export interface CreateRedisClientConfig {
  redisUrl: string;
}

export function createRedisClient(
  config: CreateRedisClientConfig,
): Redis | null {
  if (!config.redisUrl) {
    console.warn("[Redis] redisUrl is not set. Redis client was not created.");
    return null;
  }

  const redis = new Redis(config.redisUrl, {
    lazyConnect: true,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
  });

  redis.on("connect", () => {
    console.info("[Redis] Connected.");
  });

  redis.on("ready", () => {
    console.info("[Redis] Ready.");
  });

  redis.on("error", (error) => {
    console.error("[Redis] Error:", error.message);
  });

  redis.on("close", () => {
    console.warn("[Redis] Connection closed.");
  });

  return redis;
}
