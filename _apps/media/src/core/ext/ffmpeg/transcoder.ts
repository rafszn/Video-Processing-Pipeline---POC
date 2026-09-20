import ffmpeg from "fluent-ffmpeg";
import { injectable } from "tsyringe";
import { TranscodeOptions } from "./quality-presets.js";

export interface ITranscoder {
  transcode(
    inputPath: string,
    outputPath: string,
    options: TranscodeOptions,
  ): Promise<void>;
}

@injectable()
export class FfmpegTranscoderImpl implements ITranscoder {
  transcode(
    inputPath: string,
    outputPath: string,
    options: TranscodeOptions,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .size(`${options.width}x?`)
        .videoBitrate(options.videoBitrate)
        .audioBitrate(options.audioBitrate)
        .videoCodec("libx264")
        .audioCodec("aac")
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err))
        .run();
    });
  }
}
