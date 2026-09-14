import {
  RabbitMQConnection,
  type IRabbitMQConnection,
  RabbitMQConnectionOptions,
} from "./rabbitmq-connection.js";
import { container } from "tsyringe";
import { MessagingTokens } from "../tokens.js";
import { logger } from "../../Logger/winstonLogger.js";
import { Consumer, type IConsumer } from "./consumer.js";
import { Publisher, type IPublisher } from "./publisher.js";

/**
 * Initializes RabbitMQ for the service by:
 *
 * 1. Creating and establishing the RabbitMQ connection.
 * 2. Creating a confirm channel for publishing.
 * 3. Creating a standard channel for consuming.
 * 4. Creating the Publisher and Consumer abstractions.
 * 5. Registering the RabbitMQ infrastructure with the tsyringe container.
 *
 * The service only needs to provide its RabbitMQ connection options.
 *
 * Usage:
 *
 * import "reflect-metadata" in the entry file of the service
 *
 * await initiateRabbitMQ(
 *   new RabbitMQConnectionOptions(
 *     env.RABBITMQ_HOST,
 *     env.RABBITMQ_PORT,
 *     env.RABBITMQ_USERNAME,
 *     env.RABBITMQ_PASSWORD,
 *     env.RABBITMQ_VHOST,
 *   ),
 * );
 *
 * ------------------------------------------------------------------
 * Publisher usage
 * ------------------------------------------------------------------
 *
 * The publisher can be resolved manually from the tsyringe container:
 *
 * const publisher = container.resolve<IPublisher>(
 *   MessagingTokens.Publisher,
 * );
 *
 * await publisher.publish(
 *   "user.created",
 *   {
 *     userId: "123",
 *     email: "john@example.com",
 *     name: "John",
 *   },
 *   {
 *     correlationId: "request-id",
 *   },
 * );
 *
 * In most application code, the publisher should instead be injected
 * into the class that needs it:
 *
 * @injectable()
 * export class UserService {
 *   constructor(
 *     @inject(MessagingTokens.Publisher)
 *     private readonly publisher: IPublisher,
 *   ) {}
 *
 *   async createUser(): Promise<void> {
 *     // create user...
 *
 *     await this.publisher.publish(
 *       "user.created",
 *       {
 *         userId: "123",
 *         email: "john@example.com",
 *         name: "John",
 *       },
 *       {
 *         correlationId: "request-id",
 *       },
 *     );
 *   }
 * }
 *
 * ------------------------------------------------------------------
 * Consumer usage
 * ------------------------------------------------------------------
 *
 * The consumer can also be resolved manually:
 *
 * const consumer = container.resolve<IConsumer>(
 *   MessagingTokens.Consumer,
 * );
 *
 * await consumer.subscribe(
 *   "email.queue",
 *   "user.created",
 *   async (payload, metadata) => {
 *     await sendWelcomeEmail(payload.email);
 *   },
 * );
 *
 * Multiple event types can be subscribed to the same queue.
 * Each event can have its own handler while the Consumer internally
 * maintains a single RabbitMQ consumer for that queue:
 *
 * await consumer.subscribe(
 *   "email.queue",
 *   "user.created",
 *   async (payload) => {
 *     await sendWelcomeEmail(payload.email);
 *   },
 * );
 *
 * await consumer.subscribe(
 *   "email.queue",
 *   "user.deleted",
 *   async (payload) => {
 *     await sendAccountDeletedEmail(payload.email);
 *   },
 * );
 *
 * await consumer.subscribe(
 *   "email.queue",
 *   "payment.created",
 *   async (payload) => {
 *     await sendPaymentConfirmationEmail(payload.userId);
 *   },
 * );
 *
 * The consumer can also be injected directly:
 *
 * @injectable()
 * export class EmailService {
 *   constructor(
 *     @inject(MessagingTokens.Consumer)
 *     private readonly consumer: IConsumer,
 *   ) {}
 *
 *   async subscribeToEvents(): Promise<void> {
 *     await this.consumer.subscribe(
 *       "email.queue",
 *       "user.created",
 *       async (payload) => {
 *         await sendWelcomeEmail(payload.email);
 *       },
 *     );
 *   }
 * }
 */

export async function initiateRabbitMQ(
  options: RabbitMQConnectionOptions,
): Promise<void> {
  if (
    !options ||
    !options.host ||
    !options.port ||
    !options.username ||
    !options.password
  ) {
    logger.warn(
      "[RabbitMQ] Connection options are missing or incomplete. Skipping RabbitMQ initialization.",
    );

    return;
  }
  /* Create and establish the RabbitMQ connection. */
  const connection = new RabbitMQConnection();

  await connection.connect(options);

  /* Publisher uses a ConfirmChannel so publish operations can wait for broker confirmation. */
  const publisherChannel = await connection.createConfirmChannel();

  /* Consumer uses a standard Channel for message consumption. */
  const consumerChannel = await connection.createChannel();

  /*
   * Create the messaging abstractions.
   */
  const consumer = new Consumer(consumerChannel);
  const publisher = new Publisher(publisherChannel);

  connection.on("reconnected", async () => {
    try {
      const newPublisherChannel = await connection.createConfirmChannel();
      publisher.replaceChannel(newPublisherChannel);

      const newConsumerChannel = await connection.createChannel();
      await consumer.handleChannelReplaced(newConsumerChannel);

      logger.info(
        "[RabbitMQ] Publisher and Consumer channels rebuilt after reconnect.",
      );
    } catch (error) {
      logger.error(
        "[RabbitMQ] Failed to rebuild channels after reconnect.",
        error,
      );
    }
  });

  /* Register the ready-to-use infrastructure instances with the tsyringe container. */
  container.registerInstance<IRabbitMQConnection>(
    MessagingTokens.RabbitMQConnection,
    connection,
  );

  container.registerInstance<IPublisher>(MessagingTokens.Publisher, publisher);

  container.registerInstance<IConsumer>(MessagingTokens.Consumer, consumer);
}
