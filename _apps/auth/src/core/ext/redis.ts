import env from "../../global/environment.config.js";
import { createRedisClient } from "@core/building-blocks/redis";

export const redis = createRedisClient({
  redisUrl: env.REDIS_URL!,
});
