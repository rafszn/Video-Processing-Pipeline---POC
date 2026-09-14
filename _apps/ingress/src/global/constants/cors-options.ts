import { CorsOptions } from "cors";
import logger from "../library/logger.js";
import env from "../environment.config.js";

const whitelist = env.WHITELISTED.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const localhostSubdomainRegex =
  /^https?:\/\/([a-z0-9-]+\.)*localhost:517[3-8]$/;

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (
      !origin ||
      whitelist.includes(origin) ||
      localhostSubdomainRegex.test(origin)
    ) {
      return callback(null, true);
    }

    logger.error(`CORS blocked request from origin: ${origin}`);
    callback(new Error("Not allowed by CORS"));
  },

  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
};

export default corsOptions;
