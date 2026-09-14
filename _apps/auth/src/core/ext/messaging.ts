import {
  initiateRabbitMQ,
  RabbitMQConnectionOptions,
} from "@core/building-blocks/messaging";
import env from "../../global/environment.config.js";

export const initializeMessaging = async () => {
  await initiateRabbitMQ(
    new RabbitMQConnectionOptions(
      env.RABBITMQ_HOST!,
      env.RABBITMQ_PORT!,
      env.RABBITMQ_USERNAME!,
      env.RABBITMQ_PASSWORD!,
      env.RABBITMQ_VHOST!,
    ),
  );
};
