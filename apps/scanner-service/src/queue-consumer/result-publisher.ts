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

export interface ScanCompletedPayload {
  scan_id: string;
  pages_processed: number;
  pages_failed?: number;
  finished_at: string;
}

export async function publishScanCompleted(channel: Channel, payload: ScanCompletedPayload): Promise<void> {
  const queue = 'scan.completed';
  await channel.assertQueue(queue, { durable: true });
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), { persistent: true });
}

export interface ScanFailedPayload {
  scan_id: string;
  failed_step: string;
  error: string;
  finished_at: string;
}

export async function publishScanFailed(channel: Channel, payload: ScanFailedPayload): Promise<void> {
  const queue = 'scan.failed';
  await channel.assertQueue(queue, { durable: true });
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), { persistent: true });
}

export interface ScanProgressPayload {
  scan_id: string;
  progress: number;
  current_step: string;
}

export async function publishScanProgress(channel: Channel, payload: ScanProgressPayload): Promise<void> {
  const queue = 'scan.progress';
  await channel.assertQueue(queue, { durable: true });
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), { persistent: true });
}