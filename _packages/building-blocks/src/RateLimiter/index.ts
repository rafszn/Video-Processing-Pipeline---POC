import {
  rateLimit,
  ipKeyGenerator,
  type RateLimitRequestHandler,
} from "express-rate-limit";
import type { Redis } from "ioredis";
import type { Request } from "express";
import { HTTP_STATUS } from "../Validator/codes.js";
import { RedisStore, type RedisReply } from "rate-limit-redis";

interface CreateRateLimiterOptions {
  limit: number;
  windowMs: number;
  message?: string;
  keyPrefix?: string;
  redis?: Redis | null;
  skip?: (req: Request) => boolean;
  keyGenerator?: (req: Request) => string;
}

export const createRateLimiter = ({
  limit,
  windowMs,
  message,
  keyPrefix = "rl",
  skip,
  keyGenerator,
  redis,
}: CreateRateLimiterOptions): RateLimitRequestHandler => {
  const store = redis
    ? new RedisStore({
        prefix: `${keyPrefix}:`,
        sendCommand: (
          command: string,
          ...args: string[]
        ): Promise<RedisReply> =>
          redis.call(command, ...args) as Promise<RedisReply>,
      })
    : undefined;

  return rateLimit({
    limit,
    windowMs,
    legacyHeaders: false,
    standardHeaders: true,

    skip: skip ?? (() => false),

    keyGenerator: keyGenerator ?? ((req) => ipKeyGenerator(req.ip ?? "")),

    ...(store && { store }),

    handler: (_req, res) => {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        message: message ?? "Too many requests. Please try again later.",
      });
    },
  });
};
