export const SERVICES = {
  ingress: "@core/ingress",
} as const;

export type ServiceName = keyof typeof SERVICES;
