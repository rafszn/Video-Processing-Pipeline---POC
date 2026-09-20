import {
  UploadedFile,
  DeleteFileInput,
  PresignedUpload,
  UploadFileInput,
  PresignedUploadInput,
  DownloadFileInput,
  DownloadedFile,
} from "../types.js";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import path from "path";
import { extension } from "mime-types";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { StorageContract } from "../contracts/storage.contract.js";
import { Readable } from "stream";

/** presigned url max file size */
const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GiB

export interface R2StorageConfig {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  maxUploadSizeBytes?: number;
}

export class R2StorageAdapterImpl implements StorageContract {
  private bucket: string;
  private client: S3Client;
  private publicBaseUrl: string;
  private readonly maxUploadSizeBytes: number;

  constructor(config: R2StorageConfig) {
    const bucket = config.bucketName;
    const accountId = config.accountId;
    const accessKeyId = config.accessKeyId;
    const publicBaseUrl = config.publicBaseUrl;
    const secretAccessKey = config.secretAccessKey;

    if (
      !bucket ||
      !accountId ||
      !accessKeyId ||
      !publicBaseUrl ||
      !secretAccessKey
    ) {
      throw new Error("Cloudflare R2 configuration is incomplete");
    }

    this.bucket = bucket;
    this.publicBaseUrl = publicBaseUrl.replace(/\/$/, "");
    this.maxUploadSizeBytes =
      config.maxUploadSizeBytes ?? DEFAULT_MAX_UPLOAD_SIZE_BYTES;

    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async upload(input: UploadFileInput): Promise<UploadedFile> {
    const {
      buffer,
      folder = "uploads",
      filename,
      resourceType = "image",
      contentType,
    } = input;

    const resolvedContentType = contentType || "application/octet-stream";

    const extFromContentType = extension(resolvedContentType);

    const baseName = filename?.replace(/\.[^/.]+$/, "") || crypto.randomUUID();

    const finalFilename =
      extFromContentType && !path.extname(baseName)
        ? `${baseName}.${extFromContentType}`
        : filename || baseName;

    const safeFolder = folder.replace(/^\/|\/$/g, "");
    const key = `${safeFolder}/${finalFilename}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: resolvedContentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    return {
      key,
      url: `${this.publicBaseUrl}/${key}`,
      resourceType: resourceType === "auto" ? "raw" : resourceType,
    };
  }

  async download(input: DownloadFileInput): Promise<DownloadedFile> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: input.key }),
    );
    return {
      stream: result.Body as Readable,
      contentType: result.ContentType,
      contentLength: result.ContentLength,
    };
  }

  async createPresignedUpload(
    input: PresignedUploadInput,
  ): Promise<PresignedUpload> {
    const {
      size,
      folder,
      filename,
      contentType,
      resourceType = "raw",
      expiresInSeconds = 900,
    } = input;

    if (size <= 0) {
      throw new Error("Upload size must be greater than zero");
    }

    if (size > this.maxUploadSizeBytes) {
      throw new Error(
        `Upload exceeds the maximum allowed size of ${this.maxUploadSizeBytes} bytes`,
      );
    }

    if (expiresInSeconds <= 0 || expiresInSeconds > 604800) {
      throw new Error("expiresInSeconds must be between 1 and 604800 seconds");
    }

    const safeFolder = folder.replace(/^\/|\/$/g, "");

    const safeFilename = path.basename(filename);

    const key = `${safeFolder}/${crypto.randomUUID()}-${safeFilename}`;

    const command = new PutObjectCommand({
      Key: key,
      Bucket: this.bucket,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    return {
      uploadUrl,
      key,
      expiresAt,
      contentType,
      resourceType,
      fileUrl: `${this.publicBaseUrl}/${key}`,
    };
  }

  async delete(input: DeleteFileInput): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
      }),
    );
  }
}
