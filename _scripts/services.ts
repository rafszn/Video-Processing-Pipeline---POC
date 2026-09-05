export const SERVICES = {
  ingress: "@core/ingress",
  auth: "@core/auth",
} as const;

export type ServiceName = keyof typeof SERVICES;
