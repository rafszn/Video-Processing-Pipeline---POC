import { ClientSession } from "mongoose";
import { IVideo, VideoModel, VideoStatus } from "../models/video.model.js";

export interface IVideoRepository {
  create(data: { sourceObjectKey: string; email: string; variantCount: number }, session?: ClientSession): Promise<IVideo>;
  findById(id: string): Promise<IVideo | null>;
  decrementPendingVariants(id: string, session?: ClientSession): Promise<number>;
  updateStatus(id: string, status: VideoStatus, session?: ClientSession): Promise<void>;
}

class MongooseVideoRepository implements IVideoRepository {
  async create(data: { sourceObjectKey: string; email: string; variantCount: number }, session?: ClientSession) {
    const [doc] = await VideoModel.create(
      [{ sourceObjectKey: data.sourceObjectKey, email: data.email, pendingVariantCount: data.variantCount }],
      { session },
    );
    return doc;
  }

  async findById(id: string) {
    return VideoModel.findById(id);
  }

  async updateStatus(id: string, status: VideoStatus, session?: ClientSession) {
    await VideoModel.updateOne({ _id: id }, { status }, { session });
  }
  
  async decrementPendingVariants(id: string, session?: ClientSession) {
    const doc = await VideoModel.findOneAndUpdate({ _id: id }, { $inc: { pendingVariantCount: -1 } }, { new: true, session });
    if (!doc) throw new Error(`Video ${id} not found`);
    return doc.pendingVariantCount;
  }
}

export const videoRepository: IVideoRepository = new MongooseVideoRepository();