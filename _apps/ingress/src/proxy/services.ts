import env from "../global/environment.config.js";

export const services = {
  media: {
    id: "media",
    serviceName: "Media",
    target: env.MEDIA_SERVICE_URL,
  },
} as const;
