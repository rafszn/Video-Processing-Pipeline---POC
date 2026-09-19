export const QUEUES = {
  EMAIL: "email.queue",
  VIDEO_PROCESSING: "media.video.processing.queue",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
