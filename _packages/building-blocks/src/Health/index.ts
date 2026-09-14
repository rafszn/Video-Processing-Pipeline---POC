import { Request, Response } from "express";
import { HTTP_STATUS } from "../Validator/codes.js";

export const health = (serviceName: string) => {
  return (req: Request, res: Response) => {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const seconds = Math.floor(uptime % 60);
    const minutes = Math.floor((uptime % 3600) / 60);
    const hours = Math.floor((uptime % 86400) / 3600);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      status: "healthy",
      service: serviceName,
      uptime: {
        seconds: uptime,
        human: `${days}d ${hours}h ${minutes}m ${seconds}s`,
      },
      timestamp: new Date().toISOString(),
    });
  };
};
