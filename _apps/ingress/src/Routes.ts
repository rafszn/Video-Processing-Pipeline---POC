import { Router } from "express";
import { services } from "./proxy/services.js";
import { createServiceProxy } from "./proxy/proxy.js";

const router = Router();

router.use(
  "/media",
  ...createServiceProxy({
    id: services.media.id,
    target: services.media.target,
    serviceName: services.media.serviceName,
  }),
);

export default router;
