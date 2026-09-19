import mediaService from "./service.js";
import { Request, Response, NextFunction } from "express";
import { CreateVideoDTO, CreatePresignedUploadDTO } from "./dto.js";
import { HTTP_STATUS } from "../../global/constants/http-status-codes.js";

export const createPresignedUpload = async (
  req: Request<object, object, CreatePresignedUploadDTO>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await mediaService.createPresignedUpload(req.body);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Presigned upload URL generated successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const createVideo = async (
  req: Request<object, object, CreateVideoDTO>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await mediaService.createVideo({
      ...req.body,
      correlationId: req.headers["x-request-id"] as string,
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "Video processing job created",
      data,
    });
  } catch (error) {
    next(error);
  }
};
