import { Channel } from 'amqplib';
import { SCAN_RESULTS_QUEUE } from './rabbitmq-connection';
import { ViolationPrioritisee } from '../diagnostic/prioritization';

export interface PageResult {
  scan_id: string;
  page_url: string;
  violations: ViolationPrioritisee[];
  screenshot_key: string;
  scanned_at: string;
}

export function publishPageResult(channel: Channel, result: PageResult): void {
  const payload = Buffer.from(JSON.stringify(result));

  channel.sendToQueue(SCAN_RESULTS_QUEUE, payload, {
    persistent: true,
  });
}