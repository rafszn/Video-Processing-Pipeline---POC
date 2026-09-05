import type { IncomingMessage } from "node:http";

export function getForwardedHeaders(req: IncomingMessage) {
  const forwardedFor = req.headers["x-forwarded-for"];

  return {
    "x-request-id": req.headers["x-request-id"] ?? "",
    "x-forwarded-host": req.headers.host ?? "",
    "x-forwarded-proto": req.headers["x-forwarded-proto"] ?? "http",
    "x-forwarded-for":
      typeof forwardedFor === "string"
        ? forwardedFor
        : (forwardedFor?.join(", ") ?? req.socket.remoteAddress ?? ""),
  };
}
