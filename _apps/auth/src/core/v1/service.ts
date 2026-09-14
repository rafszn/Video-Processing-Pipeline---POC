import { Cache } from "../ext/cache.js";
import { MINUTE } from "@core/building-blocks/time";

class DefService {
  private readonly cachePrefix = "myapp:auth";

  async createAuth() {
    const cacheKey = Cache.createKey(this.cachePrefix);
    return Cache.getOrSet(
      cacheKey,
      async () => ({
        module: "Auth",
        status: "ready",
      }),
      5 * MINUTE,
    );
  }
}

const defService = new DefService();
export default defService;
