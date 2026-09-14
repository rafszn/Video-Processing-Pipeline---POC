import { Router } from "express";
import { getAuth } from "./controllers.js";
import { createauthSchema } from "./dto.js";
import { validate } from "@core/building-blocks/validator";

const router = Router();

router.get("/", getAuth);
router.post("/", validate(createauthSchema), getAuth);

export default router;
