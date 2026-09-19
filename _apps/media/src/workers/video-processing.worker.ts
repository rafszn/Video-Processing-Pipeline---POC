import {
  QUEUES,
  EventMap,
  type IConsumer,
  MessageMetadata,
  MessagingTokens,
} from "@core/building-blocks/messaging";
import {
  createInboxRecord,
  type IInboxRepository,
} from "@core/building-blocks/inbox";
import { inject, injectable } from "tsyringe";
import type { VideoQuality } from "../data/models/video-variant.model.js";

interface IVideoProcessor {
  process(input: {
    videoId: string;
    quality: VideoQuality;
    sourceObjectKey: string;
  }): Promise<{
    objectKey: string;
  }>;
}

type ProcessingEvent =
  | "video.process.1440p"
  | "video.process.1080p"
  | "video.process.720p"
  | "video.process.480p"
  | "video.process.360p";

const EVENT_QUALITY: Record<ProcessingEvent, VideoQuality> = {
  "video.process.720p": "720p",
  "video.process.480p": "480p",
  "video.process.360p": "360p",
  "video.process.1080p": "1080p",
  "video.process.1440p": "1440p",
};

@injectable()
export class VideoProcessingWorker {
  constructor(
    @inject(MessagingTokens.Consumer)
    private readonly consumer: IConsumer,
    private readonly processor: IVideoProcessor,
    private readonly inboxRepository: IInboxRepository,
  ) {}

  async start(): Promise<void> {
    const events = Object.keys(EVENT_QUALITY) as ProcessingEvent[];

    for (const event of events) {
      await this.consumer.subscribe(
        QUEUES.VIDEO_PROCESSING,
        event,
        async (payload, metadata) => {
          await this.handle(event, payload, metadata);
        },
        {
          prefetch: 2,
          retry: {
            factor: 2,
            maxRetries: 3,
            maxDelayMs: 30_000,
            initialDelayMs: 1_000,
          },
        },
      );
    }
  }

  async stop(): Promise<void> {
    await this.consumer.close();
  }

  private async handle(
    event: ProcessingEvent,
    payload: EventMap[ProcessingEvent],
    metadata: MessageMetadata,
  ): Promise<void> {
    const claimed = await this.inboxRepository.tryClaim(
      createInboxRecord({
        messageId: metadata.messageId,
        eventType: event,
        payload,
      }),
    );

    if (!claimed) {
      return;
    }

    const quality = EVENT_QUALITY[event];

    try {
      const result = await this.processor.process({
        videoId: payload.videoId,
        sourceObjectKey: payload.sourceObjectKey,
        quality,
      });

      // Business completion happens here:
      //
      // 1. Create VideoVariant
      // 2. Atomically decrement Video.pendingVariantCount
      // 3. If counter === 0:
      //      - mark Video completed
      //      - create video.processing.completed OutboxEvent
      //
      // This should be one MongoDB transaction.

      console.log(
        `Processed ${quality} for video ${payload.videoId}: ${result.objectKey}`,
      );

      await this.inboxRepository.markProcessed(metadata.messageId);
    } catch (error) {
      await this.inboxRepository.markFailed(
        metadata.messageId,
        error instanceof Error ? error.message : String(error),
      );

      throw error;
    }
  }
}
