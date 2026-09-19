import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

export function requestId(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const id = req.header("x-request-id") ?? randomUUID();
  req.headers["x-request-id"] = id;
  res.setHeader("x-request-id", id);
  next();
}
