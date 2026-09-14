import {
  connect,
  type Channel,
  type ChannelModel,
  type ConfirmChannel,
} from "amqplib";
import pRetry from "p-retry";
import { injectable } from "tsyringe";
import { EventEmitter } from "node:events";
import { logger } from "../../Logger/winstonLogger.js";

export class RabbitMQConnectionOptions {
  constructor(
    public readonly host: string,
    public readonly port: number,
    public readonly username: string,
    public readonly password: string,
    public readonly vhost: string = "/",
  ) {}
}

export interface IRabbitMQConnection {
  connect(options: RabbitMQConnectionOptions): Promise<void>;
  createChannel(): Promise<Channel>;
  createConfirmChannel(): Promise<ConfirmChannel>;
  getConnection(): ChannelModel;
  isConnected(): boolean;
  close(): Promise<void>;
  on(event: "connected" | "reconnected", listener: () => void): this;
  on(event: "reconnect_failed", listener: (error: Error) => void): this;
}

/**
 * Fixed reconnect behavior: exponential backoff (1s -> 2s -> 4s...), capped at 30s.
 * Retries are controlled by RECONNECT_RETRIES; emits "connected", "reconnected", or "reconnect_failed".
 */

@injectable()
export class RabbitMQConnection
  extends EventEmitter
  implements IRabbitMQConnection
{
  private static readonly RECONNECT_RETRIES: number = Infinity;
  private static readonly RECONNECT_MIN_TIMEOUT_MS = 1_000;
  private static readonly RECONNECT_MAX_TIMEOUT_MS = 30_000;
  private static readonly RECONNECT_FACTOR = 2;

  private connection: ChannelModel | null = null;
  private connectOptions: RabbitMQConnectionOptions | null = null;
  private intentionalClose = false;
  private reconnecting = false;

  public async connect(options: RabbitMQConnectionOptions): Promise<void> {
    if (this.connection) {
      return;
    }

    this.connectOptions = options;
    this.intentionalClose = false;

    await this.establishConnection(options);
  }

  public async createChannel(): Promise<Channel> {
    return this.getConnection().createChannel();
  }

  public async createConfirmChannel(): Promise<ConfirmChannel> {
    return this.getConnection().createConfirmChannel();
  }

  public getConnection(): ChannelModel {
    if (!this.connection) {
      throw new Error(
        "RabbitMQ connection has not been established. Call connect() first.",
      );
    }

    return this.connection;
  }

  public isConnected(): boolean {
    return this.connection !== null;
  }

  public async close(): Promise<void> {
    this.intentionalClose = true;

    const connection = this.connection;

    if (!connection) {
      return;
    }

    this.connection = null;

    await connection.close();
  }

  private async establishConnection(
    options: RabbitMQConnectionOptions,
  ): Promise<void> {
    const url = this.buildConnectionUrl(options);

    const connection = await connect(url);
    logger.info("Rabbitmq connection created successfully");

    connection.on("error", (error) => {
      logger.error("[RabbitMQ] Connection error:", error);
    });

    connection.on("close", () => {
      this.connection = null;

      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    });

    const wasReconnect = this.reconnecting;
    this.connection = connection;

    this.emit(wasReconnect ? "reconnected" : "connected");
  }

  private scheduleReconnect(): void {
    if (this.reconnecting || !this.connectOptions) {
      return;
    }

    this.reconnecting = true;

    pRetry(
      async () => {
        await this.establishConnection(this.connectOptions!);
      },
      {
        retries: RabbitMQConnection.RECONNECT_RETRIES,
        minTimeout: RabbitMQConnection.RECONNECT_MIN_TIMEOUT_MS,
        maxTimeout: RabbitMQConnection.RECONNECT_MAX_TIMEOUT_MS,
        factor: RabbitMQConnection.RECONNECT_FACTOR,
        onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
          logger.error(
            `[RabbitMQ] Reconnect attempt ${attemptNumber} failed. ${
              Number.isFinite(retriesLeft)
                ? `${retriesLeft} retries left.`
                : "Retrying indefinitely."
            }`,
            error,
          );
        },
      },
    )
      .then(() => {
        this.reconnecting = false;
        logger.info("[RabbitMQ] Reconnected successfully.");
      })
      .catch((error) => {
        this.reconnecting = false;
        logger.error(
          "[RabbitMQ] Reconnect attempts exhausted. Giving up.",
          error,
        );
        this.emit("reconnect_failed", error);
      });
  }

  private buildConnectionUrl(options: RabbitMQConnectionOptions): string {
    const username = encodeURIComponent(options.username);
    const password = encodeURIComponent(options.password);

    const vhost =
      options.vhost === "/" ? "" : `/${encodeURIComponent(options.vhost)}`;

    return `amqp://${username}:${password}@${options.host}:${options.port}${vhost}`;
  }
}
