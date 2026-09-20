import { VideoQuality } from "../../../data/models/video-variant.model.js";

export interface TranscodeOptions {
  width: number;
  videoBitrate: string;
  audioBitrate: string;
}

export const QUALITY_PRESETS: Record<VideoQuality, TranscodeOptions> = {
  "360p": { width: 640, videoBitrate: "800k", audioBitrate: "96k" },
  "480p": { width: 854, videoBitrate: "1200k", audioBitrate: "128k" },
  "720p": { width: 1280, videoBitrate: "3000k", audioBitrate: "128k" },
  "1080p": { width: 1920, videoBitrate: "5000k", audioBitrate: "192k" },
  "1440p": { width: 2560, videoBitrate: "9000k", audioBitrate: "192k" },
};
