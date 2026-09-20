import "reflect-metadata";
import { container } from "tsyringe";
import { dbInit } from "./data/init.js";
import { registerIoc } from "./core/ext/ioc-registration.js";
import { initializeMessaging } from "./core/ext/messaging.js";
import { VideoProcessingWorker } from "./workers/video-processing.worker.js";

async function worker() {
  await dbInit();
  await registerIoc();
  await initializeMessaging();
  const worker = container.resolve(VideoProcessingWorker);

  await worker.start();

  const shutdown = async () => {
    await worker.stop();
    process.exit(0);
  };

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

worker();
