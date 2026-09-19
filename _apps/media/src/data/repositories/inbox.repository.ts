import { mongoConnection } from "../init.js";
import { createInboxRepository } from "@core/building-blocks/inbox";

export const inboxRepository = createInboxRepository(mongoConnection);
