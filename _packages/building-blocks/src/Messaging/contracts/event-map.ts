export interface EventMap {
  "video.process.1440p": {
    videoId: string;
    sourceObjectKey: string;
  };

  "video.process.1080p": {
    videoId: string;
    sourceObjectKey: string;
  };

  "video.process.720p": {
    videoId: string;
    sourceObjectKey: string;
  };

  "video.process.480p": {
    videoId: string;
    sourceObjectKey: string;
  };

  "video.process.360p": {
    videoId: string;
    sourceObjectKey: string;
  };

  "video.processing.completed": {
    videoId: string;
  };
}

export type EventName = keyof EventMap;
