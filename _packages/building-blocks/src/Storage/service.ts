import sharp from "sharp";
import { StorageContract } from "./contracts/storage.contract.js";
import { DeleteFileInput, UploadedFile, UploadFileInput } from "./types.js";

export class StorageService {
  constructor(private readonly storageProvider: StorageContract) {}

  async upload(input: UploadFileInput): Promise<UploadedFile> {
    return this.storageProvider.upload(input);
  }

  async delete(input: DeleteFileInput): Promise<void> {
    return this.storageProvider.delete(input);
  }

  async compressImage(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .rotate()
      .webp({
        quality: 80,
        effort: 4,
      })
      .toBuffer();
  }
}
