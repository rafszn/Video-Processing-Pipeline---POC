export const QUEUES = {
  EMAIL: "email.queue",
  ANALYTICS: "analytics.queue",
  NOTIFICATION: "notification.queue",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
