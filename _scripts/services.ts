export const SERVICES = {
  ingress: "@core/ingress",
  media: "@core/media",
} as const;

export type ServiceName = keyof typeof SERVICES;
