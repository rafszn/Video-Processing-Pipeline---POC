import fs from "node:fs";
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
    fs.mkdirSync("logs", { recursive: true }); // File transport won't create this itself

    const shared = format.combine(
      format.errors({ stack: true }),
      format.timestamp(),
    );

    const buildMeta = (
      info: winston.Logform.TransformableInfo,
      includeStack: boolean,
    ): string => {
      const splat = info[Symbol.for("splat")] as unknown[] | undefined;

      if (!splat || splat.length === 0) return "";

      return splat
        .map((value) => {
          if (value instanceof Error) {
            // Console: message only. Full stack goes to logs/error.log instead.
            return includeStack
              ? (value.stack ?? value.message)
              : value.message;
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
        .join(" ");
    };

    const consoleFormat = format.combine(
      shared,
      format.colorize(), // moved here -- must NOT leak into the file transport's JSON
      format.printf((info) => {
        const meta = buildMeta(info, false);
        return `${info.timestamp} ${info.level}: ${info.message}${meta ? ` ${meta}` : ""}`;
      }),
    );

    const fileFormat = format.combine(
      shared,
      format.printf((info) => {
        const meta = buildMeta(info, true);
        return JSON.stringify(
          {
            timestamp: info.timestamp,
            level: info.level,
            message: info.message,
            meta: meta || undefined,
          },
          null,
          2,
        );
      }),
    );

    this.logger = winston.createLogger({
      level: config.level ?? "info",
      format: shared,
      transports: [
        new winston.transports.Console({ format: consoleFormat }),
        new winston.transports.File({
          filename: "logs/error.log",
          level: "error",
          format: fileFormat,
        }),
      ],
    });
  }
  // constructor(config: LoggerConfig = {}) {
  //   this.logger = winston.createLogger({
  //     level: config.level ?? "info",

  //     format: format.combine(
  //       format.colorize(),
  //       format.errors({ stack: true }),
  //       format.timestamp(),

  //       format.printf((info) => {
  //         const splat = info[Symbol.for("splat")] as unknown[] | undefined;

  //         const meta =
  //           splat && splat.length > 0
  //             ? splat
  //                 .map((value) => {
  //                   if (value instanceof Error) {
  //                     return value.stack ?? value.message;
  //                   }

  //                   if (typeof value === "object" && value !== null) {
  //                     try {
  //                       return JSON.stringify(value, null, 2);
  //                     } catch {
  //                       return "[Unserializable object]";
  //                     }
  //                   }

  //                   return String(value);
  //                 })
  //                 .join(" ")
  //             : "";

  //         return `${info.timestamp} ${info.level}: ${info.message}${
  //           meta ? ` ${meta}` : ""
  //         }`;
  //       }),
  //     ),

  //     transports: [new winston.transports.Console()],
  //   });
  // }

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

export const logger = new Logger();
