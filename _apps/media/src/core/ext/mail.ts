import env from "../../global/environment.config.js";
import { ResendMailAdapterImpl } from "@core/building-blocks/mail";

export const resendMail = new ResendMailAdapterImpl({
  apiKey: env.RESEND_API_KEY,
  defaultFrom: env.RESEND_FROM,
});
