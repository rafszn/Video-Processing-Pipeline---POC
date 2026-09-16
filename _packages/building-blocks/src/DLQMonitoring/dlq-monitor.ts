import { logger } from "../Logger/winstonLogger.js";
import { QueueName } from "../Messaging/index.js";
import { INotifier } from "./notifiers/contract.js";

export interface DlqMonitorOptions {
  vhost?: string;
  username: string;
  password: string;
  threshold: number;
  intervalMs?: number;
  notifier: INotifier;
  queues: QueueName[];
  managementApiUrl: string; // e.g. "http://localhost:15672"
}

export class DlqMonitor {
  private timer: NodeJS.Timeout | null = null;
  private readonly alerted = new Set<string>();

  constructor(private readonly options: DlqMonitorOptions) {}

  start(): void {
    this.timer = setInterval(
      () => void this.checkAll(),
      this.options.intervalMs ?? 30_000,
    );
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async checkAll(): Promise<void> {
    await Promise.all(this.options.queues.map((q) => this.checkQueue(q)));
  }

  private async checkQueue(queue: QueueName): Promise<void> {
    const dlqName = `${queue}.dlq`;
    const vhost = encodeURIComponent(this.options.vhost ?? "/");
    const auth = Buffer.from(
      `${this.options.username}:${this.options.password}`,
    ).toString("base64");

    const response = await fetch(
      `${this.options.managementApiUrl}/api/queues/${vhost}/${encodeURIComponent(dlqName)}`,
      { headers: { Authorization: `Basic ${auth}` } },
    );

    if (!response.ok) return; // queue not created yet, or auth issue, don't crash the loop

    const data = await response.json();
    const messageCount = data.messages ?? 0;

    if (messageCount >= this.options.threshold) {
      if (!this.alerted.has(dlqName)) {
        this.alerted.add(dlqName); // don't spam every 30s while it stays high
        await this.options.notifier.notify({
          queue,
          dlqName,
          messageCount,
          threshold: this.options.threshold,
        });
        logger.info("[DLQ Notifier sent:", {
          queue,
          dlqName,
          messageCount,
          threshold: this.options.threshold,
        });
      }
    } else {
      this.alerted.delete(dlqName); // allow a fresh alert if it climbs again later
    }
  }
}
