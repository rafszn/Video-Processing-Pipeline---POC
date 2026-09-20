import { container } from "tsyringe";
import { resendMail } from "./mail.js";
import { storage } from "./storage.js";
import {
  IVideoProcessor,
  VideoProcessorImpl,
} from "./ffmpeg/video-processor.js";
import {
  STORAGE_TOKEN,
  TRANSCODER_TOKEN,
  MAIL_SERVICE_TOKEN,
  VIDEO_PROCESSOR_TOKEN,
  INBOX_REPOSITORY_TOKEN,
} from "../../global/constants/ioc-tokens.js";
import logger from "../../global/library/logger.js";
import { IInboxRepository } from "@core/building-blocks/inbox";
import { StorageContract } from "@core/building-blocks/storage";
import { MailServiceContract } from "@core/building-blocks/mail";
import { FfmpegTranscoderImpl, ITranscoder } from "./ffmpeg/transcoder.js";
import { inboxRepository } from "../../data/repositories/inbox.repository.js";

export const registerIoc = async (): Promise<void> => {
  container.register<IVideoProcessor>(
    VIDEO_PROCESSOR_TOKEN,
    VideoProcessorImpl,
  );
  container.register<MailServiceContract>(MAIL_SERVICE_TOKEN, {
    useValue: resendMail,
  });

  container.register<IInboxRepository>(INBOX_REPOSITORY_TOKEN, {
    useValue: inboxRepository,
  });

  container.register<ITranscoder>(TRANSCODER_TOKEN, FfmpegTranscoderImpl);
  container.register<StorageContract>(STORAGE_TOKEN, { useValue: storage });

  logger.info("IOC Containers Initialized.");
};
