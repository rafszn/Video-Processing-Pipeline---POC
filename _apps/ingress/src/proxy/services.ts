import env from "../global/environment.config.js";

export const services = {
  auth: {
    id: "auth", /** name of service as written in APP_NAME */
    serviceName: "Auth",
    target: env.AUTH_SERVICE_URL,
  },

  users: {
    id: "users",
    serviceName: "Users",
    target: env.USER_SERVICE_URL,
  },
} as const;
