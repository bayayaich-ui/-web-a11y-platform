import amqp, { Channel, ChannelModel } from 'amqplib';

const SCAN_JOBS_QUEUE = 'scan.jobs';
const SCAN_RESULTS_QUEUE = 'scan.page_completed';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function connectQueue(): Promise<Channel> {
  if (channel) return channel;

  const url = process.env.RABBITMQ_URL || 'amqp://a11y_user:a11y_password@localhost:5672';

  // Retry loop: keep trying to connect until RabbitMQ is available.
  // This prevents the whole process from exiting when the broker is not ready in dev.
  let attempt = 0;
  while (!channel) {
    attempt += 1;
    try {
      console.log(`Connecting to RabbitMQ (${url}) attempt #${attempt}`);
      connection = await amqp.connect(url);
      channel = await connection.createChannel();

      // durable: true = la file survit à un redémarrage de RabbitMQ,
      // important pour ne pas perdre un job de scan en cours
      await channel.assertQueue(SCAN_JOBS_QUEUE, { durable: true });
      await channel.assertQueue(SCAN_RESULTS_QUEUE, { durable: true });

      // Ne traiter qu'un seul job à la fois par worker,
      // pour ne pas saturer le pool de navigateurs
      await channel.prefetch(1);

      console.log('Connected to RabbitMQ');
      return channel;
    } catch (err) {
      console.error('RabbitMQ connection failed (will retry):', err instanceof Error ? err.message : err);
      // clean up in case partial objects were created
      try {
        await connection?.close();
      } catch (e) {
        // ignore
      }
      connection = null;
      channel = null;

      // exponential backoff with cap
      const backoff = Math.min(30000, 1000 * Math.pow(2, Math.min(attempt, 5)));
      console.log(`Retrying in ${backoff}ms...`);
      await delay(backoff);
    }
  }

  // Should not reach here, but TypeScript wants a return
  throw new Error('Unable to establish RabbitMQ channel');
}

export async function closeQueue(): Promise<void> {
  try {
    await channel?.close();
  } catch (e) {
    // ignore
  }
  try {
    await connection?.close();
  } catch (e) {
    // ignore
  }
  channel = null;
  connection = null;
}

export { SCAN_JOBS_QUEUE, SCAN_RESULTS_QUEUE };