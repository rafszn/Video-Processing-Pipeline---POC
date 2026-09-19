import "reflect-metadata";
import { dbInit } from "./data/init.js";
import { initializeMessaging } from "./core/ext/messaging.js";

async function bootstrap() {
  await dbInit();
  await initializeMessaging();

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down media worker...`);
    process.exit(0);
  };

  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}

bootstrap();
