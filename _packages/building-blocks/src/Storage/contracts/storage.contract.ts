import { DeleteFileInput, UploadedFile, UploadFileInput } from "../types.js";

export interface StorageContract {
  upload(input: UploadFileInput): Promise<UploadedFile>;
  delete(input: DeleteFileInput): Promise<void>;
}
