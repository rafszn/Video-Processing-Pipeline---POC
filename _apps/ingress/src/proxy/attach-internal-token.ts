import type { ProxyConfig } from "./types.js";
import logger from "../global/library/logger.js";
import env from "../global/environment.config.js";
import type { NextFunction, Request, Response } from "express";
import { signServiceToken } from "@core/building-blocks/s2s-auth";
import { HTTP_STATUS } from "../global/constants/http-status-codes.js";

export function attachInternalServiceToken(config: ProxyConfig) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      req.internalServiceToken = await signServiceToken({
        user: req.user, // if available
        audience: config.id,
        issuer: env.APP_NAME,
      });
      next();
    } catch (error) {
      logger.error(`Failed to sign internal token for ${config.serviceName}`, {
        error,
      });
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Internal server error" });
    }
  };
}
