import {
  UploadedFile,
  DeleteFileInput,
  DownloadedFile,
  UploadFileInput,
  PresignedUpload,
  DownloadFileInput,
  PresignedUploadInput,
} from "../types.js";

export interface StorageContract {
  upload(input: UploadFileInput): Promise<UploadedFile>;
  delete(input: DeleteFileInput): Promise<void>;

  /** single part presigned */
  createPresignedUpload(input: PresignedUploadInput): Promise<PresignedUpload>;
  download(input: DownloadFileInput): Promise<DownloadedFile>;
}
