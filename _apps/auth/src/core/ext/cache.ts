import {
  CacheContract,
  RedisCacheAdapterImpl,
  MemoryCacheAdapterImpl,
} from "@core/building-blocks/cache";
import { redis } from "./redis.js";
import logger from "../../global/library/logger.js";
import env from "../../global/environment.config.js";

function createCacheService(): CacheContract {
  if (env.CACHE_DRIVER !== "redis") {
    return new MemoryCacheAdapterImpl();
  }

  if (!redis) {
    logger.warn(
      "[Cache] CACHE_DRIVER is redis, but REDIS_URL is missing. Falling back to memory cache.",
    );
    return new MemoryCacheAdapterImpl();
  }

  return new RedisCacheAdapterImpl(redis);
}

export const Cache = createCacheService();
