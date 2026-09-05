export interface CacheContract {
  createKey(prefix: string, payload?: unknown): string;

  get<T>(key: string): Promise<T | null>;

  set<T>(key: string, value: T, ttlMs: number): Promise<void>;

  getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs: number,
  ): Promise<T>;

  del(key: string): Promise<void>;

  delByPrefix(prefix: string): Promise<void>;

  clear(): Promise<void>;
}

export type CacheDriver = "memory" | "redis";
