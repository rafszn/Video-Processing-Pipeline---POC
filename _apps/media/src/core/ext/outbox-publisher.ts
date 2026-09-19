import { container, injectable } from "tsyringe";
import logger from "../../global/library/logger.js";
import { OutboxPublisher } from "@core/building-blocks/outbox";
import { IPublisher, MessagingTokens } from "@core/building-blocks/messaging";
import { outboxRepository } from "../../data/repositories/outbox.repository.js";

const BATCH_SIZE = 50;
const POLL_INTERVAL_MS = 1_000;

@injectable()
class OutboxWorker {
  private running = false;
  private publisher: OutboxPublisher | null = null;
  private loopPromise: Promise<void> | null = null;

  start(): void {
    if (this.running) {
      return;
    }

    if (!container.isRegistered(MessagingTokens.Publisher)) {
      logger.error(
        "OutboxWorker cannot start: messaging is not initialized. " +
          "Call initializeMessaging() first and make sure the RABBITMQ_* env vars are set.",
      );

      return;
    }

    const ipublisher = container.resolve<IPublisher>(MessagingTokens.Publisher);
    this.publisher = new OutboxPublisher(outboxRepository, ipublisher);

    this.running = true;
    this.loopPromise = this.run();
    logger.info("Outbox Publisher Initialized.");
  }

  async stop(): Promise<void> {
    this.running = false;

    if (this.loopPromise) {
      await this.loopPromise;
      this.loopPromise = null;
    }
  }

  private async run(): Promise<void> {
    while (this.running) {
      try {
        await this.publisher!.pollAndPublish(BATCH_SIZE);
      } catch (error) {
        logger.error("Outbox polling failed", error);
      }

      if (!this.running) {
        break;
      }

      await this.sleep(POLL_INTERVAL_MS);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}

export const outboxWorker = new OutboxWorker();
