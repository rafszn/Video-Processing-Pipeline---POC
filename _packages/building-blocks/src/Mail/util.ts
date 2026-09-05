import fs from "fs";
import path from "path";
import mime from "mime-types";
import { MailAttachment } from "./types.js";

export function getAttachmentContent(fileName: string): MailAttachment {
  const filePath = path.resolve(process.cwd(), "public", "assets", fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Attachment file not found: ${fileName}`);
  }

  return {
    filename: fileName,
    content: fs.readFileSync(filePath).toString("base64"),
    contentType: mime.lookup(filePath) || "application/octet-stream",
  };
}
