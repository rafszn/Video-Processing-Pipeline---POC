import { getAttachmentContent } from "./util.js";
import { SendEmailInput, SendEmailResult } from "./types.js";
import { MailServiceContract } from "./contracts/mail.contract.js";

export class MailService {
  constructor(private readonly mailProvider: MailServiceContract) {}

  async sendMail(input: SendEmailInput): Promise<SendEmailResult> {
    return this.mailProvider.sendMail(input);
  }

  getAttachmentContent = getAttachmentContent;
}

export default MailService;
