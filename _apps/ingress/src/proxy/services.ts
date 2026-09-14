import env from "../global/environment.config.js";

export const services = {
  auth: {
    id: "auth" /** name of service as written in APP_NAME of that service */,
    serviceName: "Auth",
    target: env.AUTH_SERVICE_URL,
  },
} as const;
