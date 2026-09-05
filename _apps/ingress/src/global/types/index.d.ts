import { Request } from "express";

export {};

declare global {
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
