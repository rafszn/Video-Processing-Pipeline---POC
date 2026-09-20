import { Readable } from "node:stream";

export type UploadOptions = {
  folder?: string;
  resourceType?: "image" | "video" | "raw";
};

export type StorageResourceType = "image" | "video" | "raw" | "auto";
export type FolderName = "uploads" | "vidpipelinePOC"; // extend this

export interface UploadFileInput {
  buffer: Buffer;
  filename?: string;
  folder: FolderName;
  contentType?: string;
  resourceType?: StorageResourceType;
}

export interface UploadedFile {
  url: string;
  key: string;
  resourceType: Exclude<StorageResourceType, "auto">;
}

export interface DeleteFileInput {
  key: string;
  resourceType?: Exclude<StorageResourceType, "auto">;
}

export interface PresignedUploadInput {
  size: number;
  filename: string;
  folder: FolderName;
  contentType: string;
  expiresInSeconds?: number;
  resourceType?: Exclude<StorageResourceType, "auto">;
}

export interface PresignedUpload {
  uploadUrl: string;
  key: string;
  fileUrl: string;
  expiresAt: Date;
  contentType: string;
  resourceType: Exclude<StorageResourceType, "auto">;
}

export interface DownloadFileInput {
  key: string;
  resourceType?: Exclude<StorageResourceType, "auto">;
}

export interface DownloadedFile {
  stream: Readable;
  contentType?: string;
  contentLength?: number;
}
