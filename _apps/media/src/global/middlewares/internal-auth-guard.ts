import env from "../environment.config.js";
import { createInternalAuthGuard } from "@core/building-blocks/s2s-auth";

const internalAuthGuard = createInternalAuthGuard({
  audience: env.APP_NAME!,
  allowedIssuers: (env.ALLOWED_INTERNAL_CALLERS ?? "").split(","),
});

export default internalAuthGuard;
