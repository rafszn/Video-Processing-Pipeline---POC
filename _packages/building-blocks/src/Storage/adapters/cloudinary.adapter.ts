import streamifier from "streamifier";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { StorageContract } from "../contracts/storage.contract.js";
import {
  DeleteFileInput,
  UploadedFile,
  UploadFileInput,
  StorageResourceType,
  PresignedUpload,
  PresignedUploadInput,
  DownloadedFile,
  DownloadFileInput,
} from "../types.js";

export interface CloudinaryStorageConfig {
  apiKey: string;
  cloudName: string;
  apiSecret: string;
}

const getUploadOptions = (resourceType: StorageResourceType) => {
  if (resourceType === "image") {
    return {
      transformation: [
        { width: 1200, crop: "limit" },
        { quality: "auto", fetch_format: "auto" },
      ],
    };
  }

  return {};
};

export class CloudinaryStorageAdapterImpl implements StorageContract {
  constructor(config: CloudinaryStorageConfig) {
    if (!config.apiKey || !config.cloudName || !config.apiSecret) {
      throw new Error("Cloudinary configuration is incomplete");
    }

    cloudinary.config({
      api_key: config.apiKey,
      cloud_name: config.cloudName,
      api_secret: config.apiSecret,
    });
  }

  async upload(input: UploadFileInput): Promise<UploadedFile> {
    const { buffer, folder = "uploads", resourceType = "auto" } = input;

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          ...getUploadOptions(resourceType),
        },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            return reject(error ?? new Error("Cloudinary upload failed"));
          }

          resolve({
            url: result.secure_url,
            key: result.public_id,
            resourceType: result.resource_type as "image" | "video" | "raw",
          });
        },
      );

      streamifier.createReadStream(buffer).pipe(stream);
    });
  }

  async delete(input: DeleteFileInput): Promise<void> {
    const { key, resourceType = "image" } = input;

    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(
        key,
        { resource_type: resourceType },
        (error, result) => {
          if (error) return reject(error);

          if (!result || result.result !== "ok") {
            return reject(
              new Error(`Cloudinary deletion failed: ${result?.result}`),
            );
          }

          resolve();
        },
      );
    });
  }

  download(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    input: DownloadFileInput,
  ): Promise<DownloadedFile> {
    throw new Error("Download Not configured");
  }

  async createPresignedUpload(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    input: PresignedUploadInput,
  ): Promise<PresignedUpload> {
    throw new Error("createPresignedUpload Not configured");
  }
}
