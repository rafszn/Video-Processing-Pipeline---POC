import { Redis } from "ioredis";
import { CacheContract } from "../contracts/cache.contract.js";

export class RedisCacheAdapterImpl implements CacheContract {
  constructor(private readonly redis: Redis) {}

  private async ensureReady(): Promise<boolean> {
    try {
      if (this.redis.status !== "ready") {
        await this.redis.connect();
      }

      return true;
    } catch (error) {
      console.error("[RedisCache]", error);
      return false;
    }
  }

  createKey(prefix: string, payload?: unknown): string {
    if (payload === undefined) return prefix;

    return `${prefix}:${JSON.stringify(payload)}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const ready = await this.ensureReady();

    if (!ready) return null;

    try {
      const value = await this.redis.get(key);

      if (value === null) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      console.error("[RedisCache] Failed to get cache value:", error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    const ready = await this.ensureReady();

    if (!ready) return;

    try {
      await this.redis.set(key, JSON.stringify(value), "PX", ttlMs);
    } catch (error) {
      console.error("[RedisCache] Failed to set cache value:", error);
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) return cached;

    const value = await factory();

    await this.set(key, value, ttlMs);

    return value;
  }

  async del(key: string): Promise<void> {
    const ready = await this.ensureReady();

    if (!ready) return;

    try {
      await this.redis.del(key);
    } catch (error) {
      console.error("[RedisCache] Failed to delete cache key:", error);
    }
  }

  async delByPrefix(prefix: string): Promise<void> {
    const ready = await this.ensureReady();

    if (!ready) return;

    try {
      let cursor = "0";

      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          "MATCH",
          `${prefix}*`,
          "COUNT",
          100,
        );

        cursor = nextCursor;

        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } while (cursor !== "0");
    } catch (error) {
      console.error("[RedisCache] Failed to delete cache by prefix:", error);
    }
  }

  async clear(): Promise<void> {
    const ready = await this.ensureReady();

    if (!ready) return;

    try {
      await this.redis.flushdb();
    } catch (error) {
      console.error("[RedisCache] Failed to clear Redis cache:", error);
    }
  }
}
