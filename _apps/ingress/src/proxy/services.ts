import env from "../global/environment.config.js";

export const services = {
  auth: {
    serviceName: "Auth",
    target: env.AUTH_SERVICE_URL,
  },

  users: {
    serviceName: "Users",
    target: env.USER_SERVICE_URL,
  },
} as const;
