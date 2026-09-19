import { mongoConnection } from "../init.js";
import { createOutboxRepository } from "@core/building-blocks/outbox";

export const outboxRepository = createOutboxRepository(mongoConnection);
