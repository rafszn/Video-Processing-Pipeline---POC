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
import { IVideoProcessor } from "../core/ext/ffmpeg/video-processor.js";
import type { VideoQuality } from "../data/models/video-variant.model.js";
import {
  VIDEO_PROCESSOR_TOKEN,
  INBOX_REPOSITORY_TOKEN,
  MAIL_SERVICE_TOKEN,
} from "../global/constants/ioc-tokens.js";
import logger from "../global/library/logger.js";
import { mongoConnection } from "../data/init.js";
import env from "../global/environment.config.js";
import { MailServiceContract } from "@core/building-blocks/mail";
import { createOutboxRecord } from "@core/building-blocks/outbox";
import { videoRepository } from "../data/repositories/video.repository.js";
import { outboxRepository } from "../data/repositories/outbox.repository.js";
import { videoVariantRepository } from "../data/repositories/video-variant.repository.js";

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
    @inject(VIDEO_PROCESSOR_TOKEN)
    private readonly processor: IVideoProcessor,
    @inject(INBOX_REPOSITORY_TOKEN)
    private readonly inboxRepository: IInboxRepository,
    @inject(MAIL_SERVICE_TOKEN)
    private readonly mailService: MailServiceContract,
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

    /** TODO: extract to email service: i took a shortcut, i know */
    await this.consumer.subscribe(
      QUEUES.EMAIL,
      "video.processing.completed",
      async (payload) => {
        await this.sendProcessingCompletedEmail(payload.videoId);
      },
    );
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

      await this.completeVariant(
        payload.videoId,
        quality,
        result.objectKey,
        metadata,
      );

      logger.info(
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

  private async completeVariant(
    videoId: string,
    quality: VideoQuality,
    objectKey: string,
    metadata: MessageMetadata,
  ): Promise<void> {
    const session = await mongoConnection.startSession();

    try {
      await session.withTransaction(async () => {
        await videoVariantRepository.create(
          {
            videoId,
            quality,
            objectKey,
          },
          session,
        );

        const pendingCount = await videoRepository.decrementPendingVariants(
          videoId,
          session,
        );

        if (pendingCount === 0) {
          await videoRepository.updateStatus(videoId, "completed", session);
          await outboxRepository.save(
            createOutboxRecord({
              aggregateId: videoId,
              aggregateType: "Video",
              eventType: "video.processing.completed",
              correlationId: metadata.correlationId,
              payload: {
                videoId,
              },
            }),
            session,
          );
        }

        await this.inboxRepository.markProcessed(metadata.messageId, session);
      });
    } finally {
      await session.endSession();
    }
  }

  private async sendProcessingCompletedEmail(videoId: string): Promise<void> {
    const [video, variants] = await Promise.all([
      videoRepository.findById(videoId),
      videoVariantRepository.findByVideoId(videoId),
    ]);

    if (!video) {
      throw new Error(`Video ${videoId} not found`);
    }

    if (variants.length === 0) {
      throw new Error(`No variants found for video ${videoId}`);
    }

    const publicBaseUrl = env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "");

    const qualityOrder: Record<VideoQuality, number> = {
      "1440p": 5,
      "1080p": 4,
      "720p": 3,
      "480p": 2,
      "360p": 1,
    };

    const completedVariants = variants
      .filter(
        (variant) =>
          variant.status === "completed" && Boolean(variant.objectKey),
      )
      .sort((a, b) => qualityOrder[b.quality] - qualityOrder[a.quality]);

    if (completedVariants.length === 0) {
      throw new Error(`No completed variants found for video ${videoId}`);
    }

    const variantRows = completedVariants
      .map((variant) => {
        const objectKey = variant.objectKey!.replace(/^\/+/, "");
        const url = `${publicBaseUrl}/${objectKey}`;

        return `
        <tr>
          <td style="
            padding: 14px 16px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 15px;
            color: #111827;
          ">
            ${variant.quality}
          </td>

          <td style="
            padding: 14px 16px;
            border-bottom: 1px solid #e5e7eb;
            text-align: right;
          ">
            <a
              href="${url}"
              target="_blank"
              rel="noopener noreferrer"
              style="
                display: inline-block;
                padding: 9px 14px;
                background: #111827;
                color: #ffffff;
                text-decoration: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
              "
            >
              View video
            </a>
          </td>
        </tr>
      `;
      })
      .join("");

    const html = `
    <!DOCTYPE html>
    <html>
      <body style="
        margin: 0;
        padding: 0;
        background: #f3f4f6;
        font-family: Arial, Helvetica, sans-serif;
        color: #111827;
      ">
        <div style="
          max-width: 680px;
          margin: 40px auto;
          padding: 0 20px;
        ">
          <div style="
            background: #ffffff;
            border-radius: 10px;
            padding: 32px;
            border: 1px solid #e5e7eb;
          ">
            <h1 style="
              margin: 0 0 12px;
              font-size: 24px;
              line-height: 1.3;
            ">
              Your video is ready
            </h1>

            <p style="
              margin: 0 0 24px;
              font-size: 15px;
              line-height: 1.6;
              color: #4b5563;
            ">
              Your video finished processing successfully.
              The available versions are listed below.
            </p>

            <table
              width="100%"
              cellspacing="0"
              cellpadding="0"
              style="
                border-collapse: collapse;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                overflow: hidden;
              "
            >
              <thead>
                <tr style="background: #f9fafb;">
                  <th
                    align="left"
                    style="
                      padding: 14px 16px;
                      border-bottom: 1px solid #e5e7eb;
                      font-size: 14px;
                      color: #374151;
                    "
                  >
                    Quality
                  </th>

                  <th
                    align="right"
                    style="
                      padding: 14px 16px;
                      border-bottom: 1px solid #e5e7eb;
                      font-size: 14px;
                      color: #374151;
                    "
                  >
                    Video
                  </th>
                </tr>
              </thead>

              <tbody>
                ${variantRows}
              </tbody>
            </table>

            <p style="
              margin: 24px 0 0;
              font-size: 13px;
              line-height: 1.5;
              color: #6b7280;
            ">
              Video ID: ${videoId}
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

    const result = await this.mailService.sendMail({
      html,
      toEmail: video.email,
      subject: "Your video is ready",
    });

    if (!result.ok) {
      throw new Error(
        `Failed to send processing completion email: ${result.error}`,
      );
    }

    logger.info(
      `Processing completion email sent to ${video.email} for video ${videoId}`,
    );
  }
}
