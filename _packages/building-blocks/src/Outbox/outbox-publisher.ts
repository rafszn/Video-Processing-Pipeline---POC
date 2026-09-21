import { OutboxRecord } from "./types.js";
import { injectable, inject } from "tsyringe";
import { logger } from "../Logger/winstonLogger.js";
import { IOutboxRepository } from "./outbox-repository.js";
import { IPublisher, MessagingTokens } from "../Messaging/index.js";

@injectable()
export class OutboxPublisher {
  constructor(
    private readonly repo: IOutboxRepository,

    @inject(MessagingTokens.Publisher)
    private readonly publisher: IPublisher,
  ) {}

  async pollAndPublish(batchSize = 50): Promise<void> {
    const records = await this.repo.claimBatch(batchSize);

    for (const record of records) {
      try {
        await this.publish(record);
        await this.repo.markPublished(record.id);
      } catch (err) {
        logger.error("[Outbox Publisher]", err);
        await this.repo.markFailed(record.id, String(err));
      }
    }
  }

  private async publish(record: OutboxRecord): Promise<void> {
    // record.eventType and record.payload are correlated, no cast needed.
    await this.publisher.publish(record.eventType, record.payload, {
      headers: record.headers,
      persistent: record.persistent,
      correlationId: record.correlationId,
    });
  }
}
