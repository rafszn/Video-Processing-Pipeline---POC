import { R2StorageAdapterImpl } from "@core/building-blocks/storage";
import env from "../../global/environment.config.js";

export const storage = new R2StorageAdapterImpl({
  accountId: env.R2_ACCOUNT_ID,
  bucketName: env.R2_BUCKET_NAME,
  accessKeyId: env.R2_ACCESS_KEY_ID,
  publicBaseUrl: env.R2_PUBLIC_BASE_URL,
  secretAccessKey: env.R2_SECRET_ACCESS_KEY,
});
