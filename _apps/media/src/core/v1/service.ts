import {
  PresignedUpload,
  StorageContract,
} from "@core/building-blocks/storage";
import { storage } from "../ext/storage.js";
import { mongoConnection } from "../../data/init.js";
import { createOutboxRecord } from "@core/building-blocks/outbox";
import { CreatePresignedUploadDTO, CreateVideoDTO } from "./dto.js";
import { VideoQuality } from "../../data/models/video-variant.model.js";
import { videoRepository } from "../../data/repositories/video.repository.js";
import { outboxRepository } from "../../data/repositories/outbox.repository.js";

class MediaService {
  constructor(private readonly storage: StorageContract) {}

  async createPresignedUpload(
    input: CreatePresignedUploadDTO,
  ): Promise<PresignedUpload> {
    return this.storage.createPresignedUpload({
      size: input.size,
      folder: "uploads",
      resourceType: "video",
      filename: input.filename,
      contentType: input.contentType,
    });
  }

  async createVideo(input: CreateVideoDTO & { correlationId: string }) {
    const session = await mongoConnection.startSession();

    try {
      let videoId = "";

      await session.withTransaction(async () => {
        const video = await videoRepository.create(
          {
            email: input.email,
            sourceObjectKey: input.sourceObjectKey,
            variantCount: input.qualities.length,
          },
          session,
        );

        videoId = video._id.toString();

        for (const quality of input.qualities) {
          const outboxRecord = this.createProcessingOutboxRecord({
            quality,
            videoId,
            correlationId: input.correlationId,
            sourceObjectKey: input.sourceObjectKey,
          });

          await outboxRepository.save(outboxRecord, session);
        }
      });

      return videoRepository.findById(videoId);
    } finally {
      await session.endSession();
    }
  }

  private createProcessingOutboxRecord({
    videoId,
    quality,
    correlationId,
    sourceObjectKey,
  }: {
    videoId: string;
    quality: VideoQuality;
    correlationId: string;
    sourceObjectKey: string;
  }) {
    const base = {
      correlationId,
      aggregateId: videoId,
      aggregateType: "Video",
      persistent: true,
      payload: {
        videoId,
        sourceObjectKey,
      },
    };

    switch (quality) {
      case "1440p":
        return createOutboxRecord({
          ...base,
          eventType: "video.process.1440p",
        });

      case "1080p":
        return createOutboxRecord({
          ...base,
          eventType: "video.process.1080p",
        });

      case "720p":
        return createOutboxRecord({
          ...base,
          eventType: "video.process.720p",
        });

      case "480p":
        return createOutboxRecord({
          ...base,
          eventType: "video.process.480p",
        });

      case "360p":
        return createOutboxRecord({
          ...base,
          eventType: "video.process.360p",
        });
    }
  }
}

const mediaService = new MediaService(storage);
export default mediaService;
