import logger from "../library/logger.js";
import { Request, Response } from "express";
import { HTTP_STATUS } from "../constants/http-status-codes.js";

export const notFound = (req: Request, res: Response) => {
  logger.error("NOT_FOUND", {
    message: `Method [${req.method}] | Route [${req.originalUrl}] not found`,
    path: req.path,
  });
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `Method [${req.method}] | Route [${req.originalUrl}] not found`,
    code: "NOT_FOUND",
  });
};
