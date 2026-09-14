import "reflect-metadata";
import App from "./app.js";
import env from "./global/environment.config.js";
import { initializeMessaging } from "./core/ext/messaging.js";

async function bootstrap() {
  const app = new App();
  await app.initialize();
  await initializeMessaging();
  const port = Number(env.PORT);
  app.listen(port);
}

bootstrap();
