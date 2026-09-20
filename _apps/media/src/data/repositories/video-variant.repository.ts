import { ClientSession } from "mongoose";
import {
  IVideoVariant,
  VideoVariantModel,
  VideoQuality,
  VideoVariantStatus,
} from "../models/video-variant.model.js";

export interface IVideoVariantRepository {
  create(
    data: {
      videoId: string;
      quality: VideoQuality;
      objectKey: string;
    },
    session?: ClientSession,
  ): Promise<IVideoVariant>;
  createMany(
    videoId: string,
    qualities: VideoQuality[],
    session?: ClientSession,
  ): Promise<IVideoVariant[]>;
  findByVideoId(videoId: string): Promise<IVideoVariant[]>;
  findOne(
    videoId: string,
    quality: VideoQuality,
  ): Promise<IVideoVariant | null>;
  updateStatus(
    id: string,
    status: VideoVariantStatus,
    objectKey?: string,
    session?: ClientSession,
  ): Promise<void>;
}

class MongooseVideoVariantRepository implements IVideoVariantRepository {
  async create(
    data: {
      videoId: string;
      quality: VideoQuality;
      objectKey: string;
    },
    session?: ClientSession,
  ) {
    const [doc] = await VideoVariantModel.create(
      [
        {
          status: "completed",
          videoId: data.videoId,
          quality: data.quality,
          objectKey: data.objectKey,
        },
      ],
      { session },
    );

    return doc;
  }
  async createMany(
    videoId: string,
    qualities: VideoQuality[],
    session?: ClientSession,
  ) {
    return VideoVariantModel.create(
      qualities.map((quality) => ({
        videoId,
        quality,
        status: "pending" as const,
      })),
      { session },
    );
  }
  async findByVideoId(videoId: string) {
    return VideoVariantModel.find({ videoId });
  }
  async findOne(videoId: string, quality: VideoQuality) {
    return VideoVariantModel.findOne({ videoId, quality });
  }
  async updateStatus(
    id: string,
    status: VideoVariantStatus,
    objectKey?: string,
    session?: ClientSession,
  ) {
    await VideoVariantModel.updateOne(
      { _id: id },
      { status, ...(objectKey ? { objectKey } : {}) },
      { session },
    );
  }
}

export const videoVariantRepository: IVideoVariantRepository =
  new MongooseVideoVariantRepository();
