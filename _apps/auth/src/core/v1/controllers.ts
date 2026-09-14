import defService from "./service.js";
import { Request, Response, NextFunction } from "express";
import { HTTP_STATUS } from "../../global/constants/http-status-codes.js";

export const getAuth = async (
  req: Request<object, object, object>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await defService.createAuth();

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "complete",
      data,
    });
  } catch (error) {
    next(error);
  }
};
