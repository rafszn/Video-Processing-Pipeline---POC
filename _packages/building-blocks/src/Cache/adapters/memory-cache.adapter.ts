import { CacheContract } from "../contracts/cache.contract.js";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class MemoryCacheAdapterImpl implements CacheContract {
  private store = new Map<string, CacheEntry<unknown>>();

  createKey(prefix: string, payload?: unknown): string {
    if (payload === undefined) return prefix;

    return `${prefix}:${JSON.stringify(payload)}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
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
    this.store.delete(key);
  }

  async delByPrefix(prefix: string): Promise<void> {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
