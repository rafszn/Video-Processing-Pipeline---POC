import { Logger } from "./winstonLogger.js";
import { Request, Response, NextFunction } from "express";

const logger = new Logger();

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    logger.info(
      `${req.method} - ${req.originalUrl} - ${
        res.statusCode
      } - ${duration}ms - ${new Date().toISOString()}`,
    );
  });

  next();
};

