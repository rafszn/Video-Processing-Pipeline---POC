import { Request } from "express";

export {};

declare global {
  namespace Express {
    interface Request {
      internalServiceToken: string
      serviceName?: string;
      user?: {
        id: string;
        [key: string]: unknown;
      };
    }
  }

  interface CreateRateLimiterOptions {
    max: number;
    windowMs: number;
    message?: string;
    keyPrefix?: string;
    skip?: (req: Request) => boolean;
    keyGenerator?: (req: Request) => string;
  }

  interface CloudinaryUploadResult {
    url: string;
    key: string;
  }
}
