import { verifyServiceToken } from "./internal.js";
import { Logger } from "../Logger/winstonLogger.js";
import type { NextFunction, Request, Response } from "express";

const logger = new Logger();

export interface InternalAuthGuardConfig {
  audience: string;
  headerName?: string;
  allowedIssuers: string[];
}

export function createInternalAuthGuard(config: InternalAuthGuardConfig) {
  const headerName = config.headerName ?? "x-internal-token";

  return async function internalAuthGuard(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const token = req.headers[headerName];

    if (!token || typeof token !== "string") {
      logger.error("Missing internal service token");
      return res
        .status(401)
        .json({ success: false, message: "Missing internal service token" });
    }

    try {
      const { caller, user } = await verifyServiceToken(token, {
        audience: config.audience,
        allowedIssuers: config.allowedIssuers,
      });
      req.serviceName = caller;
      req.user = user as Request["user"];
      next();
    } catch {
      logger.error("Invalid internal service token");
      return res
        .status(403)
        .json({ success: false, message: "Invalid internal service token" });
    }
  };
}
