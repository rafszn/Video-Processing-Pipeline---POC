import { z } from "zod";
import { HTTP_STATUS } from "./codes.js";
import { logger } from "../Logger/winstonLogger.js";
import { Request, Response, NextFunction } from "express";

type ValidationTarget = "body" | "query" | "params";

export const validate =
  <T extends z.ZodType>(schema: T, target: ValidationTarget = "body") =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);

    // if (!result.success) {
    //   logger.error(JSON.stringify(result.error.issues, null, 2));
    //   return res.status(HTTP_STATUS.BAD_REQUEST).json({
    //     success: false,
    //     message: "Validation failed",
    //     errors: result.error.issues,
    //   });
    // }

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.length > 0 ? issue.path.join(".") : target,
        message: issue.message,
      }));
      logger.error(
        "Validation error",
        JSON.stringify({ target, errors }, null, 2),
      );
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, message: "Validation failed", errors });
    }

    if (target === "query") {
      Object.assign(req.query, result.data);
    } else {
      req[target] = result.data;
    }

    next();
  };
