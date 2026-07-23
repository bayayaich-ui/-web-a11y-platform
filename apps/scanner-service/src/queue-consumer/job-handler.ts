import { Channel, ConsumeMessage } from 'amqplib';
import { SCAN_JOBS_QUEUE } from './rabbitmq-connection';

export interface ScanJob {
  scan_id: string;
  site_id: string;
  url: string;
  max_pages: number;
  max_depth: number;
}

type JobProcessor = (job: ScanJob) => Promise<void>;

const MAX_RETRIES = 3;

export async function startConsuming(channel: Channel, processJob: JobProcessor): Promise<void> {
  await channel.consume(SCAN_JOBS_QUEUE, async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    const job: ScanJob = JSON.parse(msg.content.toString());
    const retryCount = (msg.properties.headers?.['x-retry-count'] as number) || 0;

    try {
      await processJob(job);
      channel.ack(msg);
    } catch (error) {
      console.error(`Erreur lors du traitement du scan ${job.scan_id} (tentative ${retryCount + 1}):`, error);

      if (retryCount < MAX_RETRIES) {
        // Backoff exponentiel : 2s, 4s, 8s avant de réessayer
        const delayMs = 2000 * Math.pow(2, retryCount);
        console.log(`Nouvelle tentative dans ${delayMs}ms...`);

        setTimeout(() => {
          channel.sendToQueue(SCAN_JOBS_QUEUE, msg.content, {
            persistent: true,
            headers: { 'x-retry-count': retryCount + 1 },
          });
        }, delayMs);

        channel.ack(msg); // on retire l'original, le nouveau message avec le compteur incrémenté prend le relais
      } else {
        console.error(`Scan ${job.scan_id} abandonné après ${MAX_RETRIES} tentatives.`);
        channel.ack(msg); // on abandonne définitivement, sans boucler à l'infini
        // Idéalement : publier un événement "scan.failed" ici, pour que le
        // dashboard puisse informer le client que son scan a échoué
      }
    }
  });
}