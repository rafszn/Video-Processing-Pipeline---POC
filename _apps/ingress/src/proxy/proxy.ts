import type { ProxyConfig } from "./types.js";
import logger from "../global/library/logger.js";
import type { Request, Response } from "express";
import { getForwardedHeaders } from "./headers.js";
import { createProxyMiddleware } from "http-proxy-middleware";
import { HTTP_STATUS } from "../global/constants/http-status-codes.js";
import { attachInternalServiceToken } from "./attach-internal-token.js";

export function createServiceProxy(config: ProxyConfig) {
  const proxyMiddleware = createProxyMiddleware({
    target: config.target,
    changeOrigin: config.changeOrigin ?? true,
    proxyTimeout: config.timeout ?? 10_000,
    timeout: config.timeout ?? 10_000,

    on: {
      proxyReq: (proxyReq, req) => {
        const request = req as Request;
        const forwardedHeaders = getForwardedHeaders(request);

        for (const [key, value] of Object.entries(forwardedHeaders)) {
          if (value) {
            proxyReq.setHeader(key, value);
          }
        }

        proxyReq.removeHeader("x-internal-token"); // never trust the client's copy
        if (request.internalServiceToken) {
          proxyReq.setHeader("x-internal-token", request.internalServiceToken);
        }

        logger.info(`Proxying request`, {
          to: `[${config.serviceName} service]`,
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

  return [attachInternalServiceToken(config), proxyMiddleware];
}
