import { ApplicationException } from "./exception.js";
import { logger } from "../Logger/winstonLogger.js";
import { HTTP_STATUS } from "../Validator/codes.js";
import { NextFunction, Request, Response } from "express";

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  if (error instanceof ApplicationException) {
    logger.error(error.message, {
      error,
      method: req.method,
      path: req.originalUrl,
    });
    res
      .status(error.statusCode)
      .json({ success: false, message: error.message });
    return;
  }
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";
  logger.error(message, { error, method: req.method, path: req.originalUrl });
  res
    .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    .json({ success: false, message: "Internal server error" });
};
