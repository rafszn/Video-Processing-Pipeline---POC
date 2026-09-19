import "reflect-metadata";
import App from "./app.js";
import { dbInit } from "./data/init.js";
import env from "./global/environment.config.js";
import { initializeMessaging } from "./core/ext/messaging.js";
import { outboxWorker } from "./core/ext/outbox-publisher.js";

async function bootstrap() {
  const app = new App();
  await initializeMessaging();
  await app.initialize();
  await dbInit();
  outboxWorker.start();

  const port = Number(env.PORT);
  app.listen(port);
}

bootstrap();
