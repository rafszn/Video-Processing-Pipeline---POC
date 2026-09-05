import { Router } from "express";
import { services } from "./proxy/services.js";
import { createServiceProxy } from "./proxy/proxy.js";

const router = Router();

router.use(
  "/auth",
  createServiceProxy({
    serviceName: services.auth.serviceName,
    target: services.auth.target,
  }),
);

router.use(
  "/users",
  createServiceProxy({
    serviceName: services.users.serviceName,
    target: services.users.target,
  }),
);

export default router;
