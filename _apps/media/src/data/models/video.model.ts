import mongoose, { Schema, Document } from "mongoose";

export type VideoStatus = "uploaded" | "processing" | "completed" | "failed";

export interface IVideo extends Document {
  email: string;
  createdAt: Date;
  updatedAt: Date;
  status: VideoStatus;
  sourceObjectKey: string;
  pendingVariantCount: number;
}

const videoSchema = new Schema<IVideo>(
  {
    sourceObjectKey: { type: String, required: true },
    email: { type: String, required: true, index: true },
    status: {
      index: true,
      type: String,
      default: "uploaded",
      enum: ["uploaded", "processing", "completed", "failed"],
    },
    pendingVariantCount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

export const VideoModel =
  (mongoose.models.Video as mongoose.Model<IVideo>) ||
  mongoose.model<IVideo>("Video", videoSchema);
