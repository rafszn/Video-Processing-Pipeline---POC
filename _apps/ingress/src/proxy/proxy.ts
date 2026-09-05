import type { Response } from "express";
import type { ProxyConfig } from "./types.js";
import logger from "../global/library/logger.js";
import { getForwardedHeaders } from "./headers.js";
import { createProxyMiddleware } from "http-proxy-middleware";
import { HTTP_STATUS } from "../global/constants/http-status-codes.js";

export function createServiceProxy(config: ProxyConfig) {
  return createProxyMiddleware({
    target: config.target,
    changeOrigin: config.changeOrigin ?? true,
    proxyTimeout: config.timeout ?? 10_000,
    timeout: config.timeout ?? 10_000,

    on: {
      proxyReq: (proxyReq, req) => {
        const forwardedHeaders = getForwardedHeaders(req);

        for (const [key, value] of Object.entries(forwardedHeaders)) {
          if (value) {
            proxyReq.setHeader(key, value);
          }
        }

        logger.debug(`[${config.serviceName}] Proxying request`, {
          requestId: req.headers["x-request-id"],
          method: req.method,
          path: req.url,
          target: config.target,
        });
      },

      error: (error, req, res) => {
        const response = res as Response;

        logger.error(`[${config.serviceName}] Proxy error`, {
          requestId: req.headers["x-request-id"],
          method: req.method,
          path: req.url,
          target: config.target,
          error,
        });

        if (!response.headersSent) {
          response.status(HTTP_STATUS.BAD_GATEWAY).json({
            success: false,
            message: `${config.serviceName} service unavailable`,
            requestId: req.headers["x-request-id"],
          });
        }
      },
    },
  });
}
