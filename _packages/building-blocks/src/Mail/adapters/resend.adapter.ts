/* eslint-disable @typescript-eslint/no-explicit-any */
import { Resend } from "resend";
import { SendEmailInput, SendEmailResult } from "../types.js";
import { MailServiceContract } from "../contracts/mail.contract.js";

const DEFAULT_SUBJECT = "Notification";

export interface ResendMailAdapterConfig {
  apiKey: string;
  defaultFrom: string; // e.g., "MyApp <app@myapp.com>"
}

export class ResendMailAdapterImpl implements MailServiceContract {
  private readonly resend: Resend | null;
  private readonly defaultFrom: string;

  constructor(config: ResendMailAdapterConfig) {
    if (!config.apiKey || !config.defaultFrom) {
      console.warn(
        "[ResendMail] RESEND_API_KEY or defaultFrom value is not set.",
      );
      this.resend = null;
      this.defaultFrom = "";
      return;
    }

    this.defaultFrom = config.defaultFrom;
    this.resend = new Resend(config.apiKey);
  }

  async sendMail(input: SendEmailInput): Promise<SendEmailResult> {
    if (!this.resend) {
      return {
        ok: false,
        error: "Resend is not configured. Missing RESEND_API_KEY.",
      };
    }

    const {
      toEmail,
      subject = DEFAULT_SUBJECT,
      templateId,
      params,
      html,
      from = this.defaultFrom,
      cc,
      bcc,
      replyTo,
      attachments,
    } = input;

    if (!toEmail || (Array.isArray(toEmail) && toEmail.length === 0)) {
      return { ok: false, error: "`toEmail` is required." };
    }

    if (!from) {
      return { ok: false, error: "`from` email is required." };
    }

    const hasTemplate = Boolean(templateId);
    const hasHtml = typeof html === "string" && html.trim().length > 0;

    if (!hasTemplate && !hasHtml) {
      return {
        ok: false,
        error: "Provide either `templateId` or `html`.",
      };
    }

    if (!hasTemplate && params && Object.keys(params).length > 0) {
      return {
        ok: false,
        error: "`params` requires `templateId`.",
      };
    }

    try {
      const payload: any = {
        from,
        to: toEmail,
        subject,
        ...(cc?.length ? { cc } : {}),
        ...(bcc?.length ? { bcc } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(attachments?.length ? { attachments } : {}),
      };

      if (hasTemplate) {
        const template = await this.getTemplate(templateId!);

        if (!template) {
          return {
            ok: false,
            error: `Template not found: ${templateId}`,
          };
        }

        payload.from = template.from || from;
        payload.subject = template.subject || subject;
        payload.html = template.html;

        if (params && Object.keys(params).length > 0) {
          payload.params = params;
        }
      } else {
        payload.html = html;
      }

      const { data, error } = await this.resend.emails.send(payload);

      if (error) {
        return {
          ok: false,
          error: error.message || "Failed to send email.",
        };
      }

      return {
        ok: true,
        id: data?.id ?? "",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        ok: false,
        error: message || "Unexpected mail error.",
      };
    }
  }

  private async getTemplate(templateId: string) {
    if (!this.resend) return null;

    const result = await this.resend.templates.get(templateId);

    return result.data;
  }
}
