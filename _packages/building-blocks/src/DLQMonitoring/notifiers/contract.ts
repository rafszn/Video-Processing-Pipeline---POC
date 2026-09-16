export interface DlqAlert {
  queue: string;
  dlqName: string;
  threshold: number;
  messageCount: number;
}

export interface INotifier {
  notify(alert: DlqAlert): Promise<void>;
}
