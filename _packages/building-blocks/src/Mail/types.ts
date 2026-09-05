export type SendEmailInput = {
  toEmail: string | string[];
  subject?: string;
  templateId?: string;
  params?: Record<string, unknown>;
  html?: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string | string[];
  attachments?: MailAttachment[];
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type MailAttachment = {
  path?: string; // Cloudinary / remote file
  filename: string;
  contentType?: string;
  content?: Buffer | string; // For local file
};
