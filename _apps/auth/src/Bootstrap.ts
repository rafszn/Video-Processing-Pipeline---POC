import App from "./app.js";
import env from "./global/environment.config.js";

async function bootstrap() {
  const app = new App();
  await app.initialize();
  const port = Number(env.PORT);
  app.listen(port);
}

bootstrap();
