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

        format.printf((info) => {
          const splat = info[Symbol.for("splat")] as unknown[] | undefined;

          const meta =
            splat && splat.length > 0
              ? splat
                  .map((value) => {
                    if (value instanceof Error) {
                      return value.stack ?? value.message;
                    }

                    if (typeof value === "object" && value !== null) {
                      try {
                        return JSON.stringify(value, null, 2);
                      } catch {
                        return "[Unserializable object]";
                      }
                    }

                    return String(value);
                  })
                  .join(" ")
              : "";

          return `${info.timestamp} ${info.level}: ${info.message}${
            meta ? ` ${meta}` : ""
          }`;
        }),
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
        error: {
          name: message.name,
          message: message.message,
          stack: message.stack,
        },
        ...Object.fromEntries(
          meta.map((value, index) => [`meta_${index + 1}`, value]),
        ),
      });

      return;
    }

    this.logger.error(message, ...meta);
  }

  verbose(message: string, ...meta: unknown[]): void {
    this.logger.verbose(message, ...meta);
  }
}
