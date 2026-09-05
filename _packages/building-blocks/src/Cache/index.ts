/**
 * The type of cache to be used should be specified in the configuration. The available options are:
 * - "memory": Uses an in-memory cache implementation. This is suitable for single-instance applications or for testing purposes.
 * - "redis": Uses a Redis-based cache implementation. This is suitable for distributed applications where multiple instances need to share the same cache.
 */

export { RedisCacheAdapterImpl } from "./adapters/redis-cache.adapter.js";
export { MemoryCacheAdapterImpl } from "./adapters/memory-cache.adapter.js";
export { CacheContract, CacheDriver } from "./contracts/cache.contract.js";
