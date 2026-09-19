import { z } from "zod";

export const videoQualitySchema = z.enum([
  "1440p",
  "1080p",
  "720p",
  "480p",
  "360p",
]);

export const createPresignedUploadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
});

export const createVideoSchema = z.object({
  sourceObjectKey: z.string().min(1),
  email: z.email(),
  qualities: z
    .array(videoQualitySchema)
    .min(1)
    .max(5)
    .refine((qualities) => new Set(qualities).size === qualities.length, {
      message: "Duplicate video qualities are not allowed",
    }),
});

export type CreatePresignedUploadDTO = z.infer<
  typeof createPresignedUploadSchema
>;

export type CreateVideoDTO = z.infer<typeof createVideoSchema>;
