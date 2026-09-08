import { Router } from "express";
import { services } from "./proxy/services.js";
import { createServiceProxy } from "./proxy/proxy.js";

const router = Router();

router.use(
  "/auth",
  ...createServiceProxy({
    id: services.auth.id,
    target: services.auth.target,
    serviceName: services.auth.serviceName,
  }),
);

router.use(
  "/users",
  ...createServiceProxy({
    id: services.users.id,
    target: services.users.target,
    serviceName: services.users.serviceName,
  }),
);

export default router;
