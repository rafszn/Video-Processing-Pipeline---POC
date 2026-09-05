import hpp from "hpp";
import helmet from "helmet";
import Routes from "./Routes.js";
import compression from "compression";
import cookieParser from "cookie-parser";
import express, { Application } from "express";
import logger from "./global/library/logger.js";
import env from "./global/environment.config.js";
import { requestLogger } from "@core/building-blocks/logger";
import { requestId } from "./global/middlewares/request-id.js";
import { HTTP_STATUS } from "./global/constants/http-status-codes.js";
// import corsOptions from "./global/constants/cors-options.js";
// import requestLogger from "./global/middlewares/request-logger.js";
// import { notFoundHandler } from "./global/middlewares/not-found.js";
// import { errorHandler } from "./global/middlewares/error-handler.js";
// import { requestGuard } from "./global/middlewares/request-guard.js";
// import { globalRateLimiter } from "./global/middlewares/rate-limiter.js";
// import { setupSwaggerDocs } from "./docs/swagger.js";
// import cors from "cors";

export default class App {
  public app: Application;
  constructor() {
    this.app = express();
  }

  async initialize() {
    this.app.set("trust proxy", true); // req.ip
    this.app.use(requestId);

    // security middlewares
    this.app.use(helmet({ contentSecurityPolicy: false }));
    // this.app.use(cors(corsOptions));
    this.app.use(compression());
    this.app.use(hpp());
    this.app.use(cookieParser());
    this.app.use(requestLogger);
    // this.app.use(globalRateLimiter);
    // this.app.use(requestGuard); // block scanners / traversal
    // this.app.use(express.static("public"));

    // health check
    this.app.get("/health", (req, res) => {
      const uptime = process.uptime();
      const days = Math.floor(uptime / 86400);
      const seconds = Math.floor(uptime % 60);
      const minutes = Math.floor((uptime % 3600) / 60);
      const hours = Math.floor((uptime % 86400) / 3600);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        status: "healthy",
        service: "ingress",
        uptime: {
          seconds: uptime,
          human: `${days}d ${hours}h ${minutes}m ${seconds}s`,
        },
        timestamp: new Date().toISOString(),
      });
    });

    this.app.get("/", (req, res) => {
      res.status(HTTP_STATUS.OK).json({
        server: "ingress",
      });
    });

    // routes
    this.app.use("/v1", Routes);

    //docs
    // setupSwaggerDocs(this.app);

    // 404 and error handler
    // this.app.use(notFoundHandler);
    // this.app.use(errorHandler);
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
