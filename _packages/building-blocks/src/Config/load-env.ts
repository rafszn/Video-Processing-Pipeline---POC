import { z } from "zod";

export function loadEnv<T extends z.ZodType>(
  schema: T,
  serviceName: string,
): z.infer<T> {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    console.error(
      `[${serviceName}] Environment validation failed:`,
      z.treeifyError(result.error),
    );

    throw new Error(`[${serviceName}] Invalid environment configuration`);
  }

  return result.data;
}
