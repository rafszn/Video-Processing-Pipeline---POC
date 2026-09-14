import hpp from "hpp";
import cors from "cors";
import helmet from "helmet";
import Routes from "./Routes.js";
import compression from "compression";
import { redis } from "./ext/redis.js";
import cookieParser from "cookie-parser";
import express, { Application } from "express";
import logger from "./global/library/logger.js";
import env from "./global/environment.config.js";
import { MINUTE } from "@core/building-blocks/time";
import { health } from "@core/building-blocks/health";
import { requestLogger } from "@core/building-blocks/logger";
import corsOptions from "./global/constants/cors-options.js";
import { requestId } from "./global/middlewares/request-id.js";
import { errorHandler } from "@core/building-blocks/exceptions";
import { notFoundHandler } from "./global/middlewares/not-found.js";
import { requestGuard } from "./global/middlewares/request-guard.js";
import { HTTP_STATUS } from "./global/constants/http-status-codes.js";
import { createRateLimiter } from "@core/building-blocks/rate-limiter";

export default class App {
  public app: Application;
  constructor() {
    this.app = express();
  }

  async initialize() {
    this.app.set("trust proxy", true);

    this.app.use(requestId);

    this.app.use(helmet({ contentSecurityPolicy: false }));
    this.app.use(cors(corsOptions));
    this.app.use(hpp());

    this.app.use(requestLogger);
    this.app.use(
      createRateLimiter({
        redis,
        limit: 200,
        windowMs: 10 * MINUTE,
      }),
    );

    this.app.use(compression());
    this.app.use(cookieParser());

    this.app.use(requestGuard);

    // health check
    this.app.get("/health", health(env.APP_NAME));

    this.app.get("/", (req, res) => {
      res.status(HTTP_STATUS.OK).json({
        server: env.APP_NAME,
      });
    });

    // routes
    this.app.use(Routes);

    // 404 and error handler
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  listen(port: number) {
    this.app.listen(port, () => {
      logger.info(`[${env.APP_NAME}] Server listening`, {
        port,
        environment: env.NODE_ENV,
      });
    });
  }
}
