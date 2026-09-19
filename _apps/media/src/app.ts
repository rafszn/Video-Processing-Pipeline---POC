import hpp from "hpp";
import helmet from "helmet";
import Routes from "./Routes.js";
import { Server } from "node:http";
import compression from "compression";
import cookieParser from "cookie-parser";
import express, { Application } from "express";
import logger from "./global/library/logger.js";
import env from "./global/environment.config.js";
import { health } from "@core/building-blocks/health";
import { requestLogger } from "@core/building-blocks/logger";
import { notFound } from "./global/middlewares/not-found.js";
import { requestId } from "./global/middlewares/request-id.js";
import { errorHandler } from "@core/building-blocks/exceptions";
import internalAuthGuard from "./global/middlewares/internal-auth-guard.js";

export default class App {
  public app: Application;
  private server: Server | null = null;

  constructor() {
    this.app = express();
  }

  async initialize() {
    this.app.set("trust proxy", true);
    this.app.use(requestId);

    // security middlewares
    this.app.use(helmet({ contentSecurityPolicy: false }));
    this.app.use(compression());
    this.app.use(hpp());
    this.app.use(cookieParser());
    this.app.use(requestLogger);

    // health check
    this.app.get("/health", health(env.APP_NAME));

    this.app.use(internalAuthGuard);
    this.app.use(express.json());

    // routes
    this.app.use(Routes);

    this.app.use(notFound);
    this.app.use(errorHandler);
  }

  listen(port: number) {
    this.server = this.app.listen(port, () => {
      logger.info(`[${env.APP_NAME}] Server listening`, {
        port,
        environment: env.NODE_ENV,
      });
    });

    return this.server;
  }

  async close(): Promise<void> {
    if (!this.server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.server!.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    this.server = null;
  }
}
