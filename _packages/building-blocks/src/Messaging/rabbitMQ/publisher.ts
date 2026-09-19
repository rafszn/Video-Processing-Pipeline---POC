import pRetry from "p-retry";
import { injectable } from "tsyringe";
import { randomUUID } from "node:crypto";
import type { ConfirmChannel, Options } from "amqplib";
import { logger } from "../../Logger/winstonLogger.js";
import type { EventMap, EventName } from "../contracts/event-map.js";

export interface PublishOptions {
  correlationId: string;
  headers?: Record<string, unknown>;
  persistent?: boolean;
}

export interface PublisherRetryOptions {
  retries?: number;
  minTimeout?: number;
  maxTimeout?: number;
  factor?: number;
}

export interface IPublisher {
  publish<K extends EventName>(
    event: K,
    payload: EventMap[K],
    options: PublishOptions,
  ): Promise<void>;
}

@injectable()
export class Publisher implements IPublisher {
  private readonly assertedExchanges = new Map<string, Promise<void>>();
  constructor(private channel: ConfirmChannel) {}

  public async publish<K extends EventName>(
    event: K,
    payload: EventMap[K],
    options: PublishOptions,
  ): Promise<void> {
    const messageId = randomUUID();

    const properties: Options.Publish = {
      messageId,
      type: event,
      timestamp: Date.now(),
      headers: options.headers,
      contentEncoding: "utf-8",
      contentType: "application/json",
      correlationId: options.correlationId,
      persistent: options.persistent ?? true,
    };

    const message = Buffer.from(JSON.stringify(payload), "utf-8");

    await pRetry(
      async () => {
        await this.ensureExchangeAsserted(event);
        await this.publishMessage(event, message, properties);
      },
      {
        factor: 2,
        retries: 3,
        minTimeout: 250,
        maxTimeout: 5_000,

        onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
          logger.error(
            `[RabbitMQ] Failed to publish "${String(event)}". ` +
              `Attempt ${attemptNumber}. ` +
              `${retriesLeft} retries remaining.`,
            error,
          );
        },
      },
    );

    logger.info("Message published", {
      event,
      messageId,
      correlationId: options.correlationId,
    });
  }

  private async ensureExchangeAsserted(event: string): Promise<void> {
    const existing = this.assertedExchanges.get(event);

    if (existing) {
      await existing;
      return;
    }

    const assertion = this.channel
      .assertExchange(event, "fanout", { durable: true })
      .then(() => undefined);

    this.assertedExchanges.set(event, assertion);

    try {
      await assertion;
    } catch (error) {
      this.assertedExchanges.delete(event);
      throw error;
    }
  }

  private async publishMessage(
    exchange: string,
    message: Buffer,
    properties: Options.Publish,
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.channel.publish(exchange, "", message, properties, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  public replaceChannel(channel: ConfirmChannel): void {
    this.channel = channel;
    this.assertedExchanges.clear();
  }
}
