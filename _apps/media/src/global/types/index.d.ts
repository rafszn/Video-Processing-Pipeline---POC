export {};

declare global {
  namespace Express {
    interface Request {
      internalServiceToken: string;
      serviceName?: string;
      user?: {
        id: string;
        [key: string]: unknown;
      };
    }
  }
}
