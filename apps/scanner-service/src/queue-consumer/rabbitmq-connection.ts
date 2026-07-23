import amqp, { Channel, ChannelModel } from 'amqplib';

const SCAN_JOBS_QUEUE = 'scan.jobs';
const SCAN_RESULTS_QUEUE = 'scan.page_completed';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export async function connectQueue(): Promise<Channel> {
  if (channel) return channel;

  const url = process.env.RABBITMQ_URL || 'amqp://a11y_user:a11y_password@localhost:5672';
  connection = await amqp.connect(url);
  channel = await connection.createChannel();

  // durable: true = la file survit à un redémarrage de RabbitMQ,
  // important pour ne jamais perdre un job de scan en cours
  await channel.assertQueue(SCAN_JOBS_QUEUE, { durable: true });
  await channel.assertQueue(SCAN_RESULTS_QUEUE, { durable: true });

  // Ne traiter qu'un seul job à la fois par worker,
  // pour ne pas saturer le pool de navigateurs
  await channel.prefetch(1);

  return channel;
}

export async function closeQueue(): Promise<void> {
  await channel?.close();
  await connection?.close();
  channel = null;
  connection = null;
}

export { SCAN_JOBS_QUEUE, SCAN_RESULTS_QUEUE };