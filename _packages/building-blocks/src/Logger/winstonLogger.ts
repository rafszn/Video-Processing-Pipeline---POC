import winston, { format } from "winston";

export interface LoggerConfig {
  level?: "debug" | "info";
}

export interface ILogger {
  debug(message: string, ...meta: unknown[]): void;
  info(message: string, ...meta: unknown[]): void;
  warn(message: string, ...meta: unknown[]): void;
  error(message: string | Error, ...meta: unknown[]): void;
  verbose(message: string, ...meta: unknown[]): void;
}

export class Logger implements ILogger {
  private readonly logger: winston.Logger;

  constructor(config: LoggerConfig = {}) {
    this.logger = winston.createLogger({
      level: config.level ?? "info",

      format: format.combine(
        format.colorize(),
        format.errors({ stack: true }),
        format.timestamp(),
        format.align(),
        format.printf(
          (info) => `${info.timestamp} ${info.level}: ${info.message}`,
        ),
      ),

      transports: [new winston.transports.Console()],
    });
  }

  debug(message: string, ...meta: unknown[]): void {
    this.logger.debug(message, ...meta);
  }

  info(message: string, ...meta: unknown[]): void {
    this.logger.info(message, ...meta);
  }

  warn(message: string, ...meta: unknown[]): void {
    this.logger.warn(message, ...meta);
  }

  error(message: string | Error, ...meta: unknown[]): void {
    if (message instanceof Error) {
      this.logger.error(message.message, {
        stack: message.stack,
        ...meta,
      });

      return;
    }

    this.logger.error(message, ...meta);
  }

  verbose(message: string, ...meta: unknown[]): void {
    this.logger.verbose(message, ...meta);
  }
}
