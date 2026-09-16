import { DlqAlert, INotifier } from "../contract.js";

export class DiscordWebhookNotifier implements INotifier {
  constructor(private readonly webhookUrl: string) {}

  async notify(alert: DlqAlert): Promise<void> {
    await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `🚨 **${alert.dlqName}** has ${alert.messageCount} messages (threshold: ${alert.threshold}).`,
      }),
    });
  }
}