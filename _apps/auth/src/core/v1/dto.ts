import { z } from "zod";

export const createauthSchema = z.object({
  type: z.string().min(2),
});

export type CreateauthDTO = z.infer<typeof createauthSchema>;