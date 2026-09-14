import { Request, Response, NextFunction } from "express";
import { HTTP_STATUS } from "../constants/http-status-codes.js";

const BLOCKED_UA_PATTERNS = [
  /zgrab/i,
  /nikto/i,
  /sqlmap/i,
  /nessus/i,
  /masscan/i,
  /python-requests/i,
];

const BLOCKED_PATH_PATTERNS = [
  /\.env/i,
  /\/\.\./, // path traversal
  /\.php$/i,
  /\.asp$/i,
  /\/wp-admin/i,
];

export const requestGuard = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const ua = String(req.headers["user-agent"] ?? "");
  const path = req.originalUrl;

  if (BLOCKED_UA_PATTERNS.some((p) => p.test(ua))) {
    return res
      .status(HTTP_STATUS.FORBIDDEN)
      .json({ success: false, message: "Forbidden" });
  }

  if (BLOCKED_PATH_PATTERNS.some((p) => p.test(path))) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json({ success: false, message: "Not found" });
  }

  next();
};
