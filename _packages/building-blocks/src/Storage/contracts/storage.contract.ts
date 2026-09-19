import {
  UploadedFile,
  DeleteFileInput,
  PresignedUpload,
  UploadFileInput,
  PresignedUploadInput,
} from "../types.js";

export interface StorageContract {
  upload(input: UploadFileInput): Promise<UploadedFile>;
  delete(input: DeleteFileInput): Promise<void>;

  /** single part presigned */
  createPresignedUpload(input: PresignedUploadInput): Promise<PresignedUpload>;
}
