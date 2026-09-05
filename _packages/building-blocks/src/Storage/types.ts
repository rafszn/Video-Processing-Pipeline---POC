export type UploadOptions = {
  folder?: string;
  resourceType?: "image" | "video" | "raw";
};

export type StorageResourceType = "image" | "video" | "raw" | "auto";
export type FolderName = "uploads"; // extend this

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
