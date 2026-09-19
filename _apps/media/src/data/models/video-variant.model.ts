import mongoose, { Schema, Document, Types } from "mongoose";

export type VideoVariantStatus =
  | "failed"
  | "pending"
  | "completed"
  | "processing";

export type VideoQuality = "1440p" | "1080p" | "720p" | "480p" | "360p";

export interface IVideoVariant extends Document {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  quality: VideoQuality;
  videoId: Types.ObjectId;
  objectKey: string | null;
  status: VideoVariantStatus;
}

const videoVariantSchema = new Schema<IVideoVariant>(
  {
    videoId: {
      type: Schema.Types.ObjectId,
      ref: "Video",
      required: true,
      index: true,
    },
    quality: {
      type: String,
      required: true,
      enum: ["1440p", "1080p", "720p", "480p", "360p"],
    },
    status: {
      index: true,
      type: String,
      default: "pending",
      enum: ["pending", "processing", "completed", "failed"],
    },
    objectKey: { type: String, default: null },
  },
  { timestamps: true },
);

// One row per (video, quality) guards against a duplicate processing job.
videoVariantSchema.index({ videoId: 1, quality: 1 }, { unique: true });

export const VideoVariantModel =
  (mongoose.models.VideoVariant as mongoose.Model<IVideoVariant>) ||
  mongoose.model<IVideoVariant>("VideoVariant", videoVariantSchema);
