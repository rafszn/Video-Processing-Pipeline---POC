export {};

declare global {
  namespace Express {
    interface Request {
      serviceName?: string;
      user?: { id: string; role: string; [key: string]: unknown }; // whatever shape fits this service
    }
  }
}
