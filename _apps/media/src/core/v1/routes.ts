import { Router } from "express";
import { validate } from "@core/building-blocks/validator";
import { createPresignedUpload, createVideo } from "./controllers.js";
import { createPresignedUploadSchema, createVideoSchema } from "./dto.js";

const router = Router();

router.post(
  "/presign_url",
  validate(createPresignedUploadSchema),
  createPresignedUpload,
);

router.post("/", validate(createVideoSchema), createVideo);

export default router;
