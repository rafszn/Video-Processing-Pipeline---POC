import { SendEmailInput, SendEmailResult } from "../types.js";

export interface MailServiceContract {
  sendMail(input: SendEmailInput): Promise<SendEmailResult>;
}
