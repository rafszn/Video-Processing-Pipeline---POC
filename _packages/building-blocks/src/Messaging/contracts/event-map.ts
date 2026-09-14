export interface EventMap {
  "user.created": {
    userId: string;
    email: string;
    name: string;
  };

  "user.deleted": {
    userId: string;
    email: string;
    reason?: string;
  };

  "payment.created": {
    paymentId: string;
    userId: string;
    amount: number;
    currency: string;
  };

  "payment.failed": {
    paymentId: string;
    userId: string;
    amount: number;
    currency: string;
    reason: string;
  };
}

export type EventName = keyof EventMap;
