import path from "node:path";
import { tmpdir } from "node:os";
import { createWriteStream } from "node:fs";
import { inject, injectable } from "tsyringe";
import { ITranscoder } from "./transcoder.js";
import { pipeline } from "node:stream/promises";
import {
  STORAGE_TOKEN,
  TRANSCODER_TOKEN,
} from "../../../global/constants/ioc-tokens.js";
import { QUALITY_PRESETS } from "./quality-presets.js";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { StorageContract } from "@core/building-blocks/storage";
import { VideoQuality } from "../../../data/models/video-variant.model.js";

export interface IVideoProcessor {
  process(input: {
    videoId: string;
    quality: VideoQuality;
    sourceObjectKey: string;
  }): Promise<{
    objectKey: string;
  }>;
}

@injectable()
export class VideoProcessorImpl implements IVideoProcessor {
  constructor(
    @inject(STORAGE_TOKEN)
    private readonly storage: StorageContract,
    @inject(TRANSCODER_TOKEN)
    private readonly transcoder: ITranscoder,
  ) {}

  async process(input: {
    videoId: string;
    quality: VideoQuality;
    sourceObjectKey: string;
  }) {
    const workDir = await mkdtemp(path.join(tmpdir(), "video-processing-"));
    const inputPath = path.join(workDir, "source");
    const outputPath = path.join(workDir, "output.mp4");

    try {
      const { stream } = await this.storage.download({
        key: input.sourceObjectKey,
      });
      await pipeline(stream, createWriteStream(inputPath));

      await this.transcoder.transcode(
        inputPath,
        outputPath,
        QUALITY_PRESETS[input.quality],
      );

      const buffer = await readFile(outputPath);
      const uploaded = await this.storage.upload({
        buffer,
        resourceType: "video",
        folder: "vidpipelinePOC",
        contentType: "video/mp4",
        filename: `${input.videoId}-${input.quality}.mp4`,
      });

      return { objectKey: uploaded.key };
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }
}
