import { randomUUID } from "node:crypto";
import { SECOND } from "../Time/index.js";
import { EventName } from "../Messaging/index.js";
import { Connection, Schema, Model } from "mongoose";
import { OutboxRecord, OutboxStatus } from "./types.js";
import { IOutboxRepository } from "./outbox-repository.js";

interface OutboxDocument {
  _id: string;
  createdAt: Date;
  payload: unknown;
  attempts: number;
  occurredAt: Date;
  aggregateId: string;
  eventType: EventName;
  status: OutboxStatus;
  persistent?: boolean;
  correlationId: string;
  aggregateType: string;
  lastError: string | null;
  publishedAt: Date | null;
  headers?: Record<string, unknown>;

  /**  
   Mongo-internal lease bookkeeping and deliberately NOT part of the shared
   OutboxRecord type. A different backend (e.g. Postgres SELECT ... FOR
   UPDATE SKIP LOCKED) wouldn't need these at all. the open transaction
   IS the claim there.
  */
  claimedBy: string | null;
  claimedUntil: Date | null;
}

const outboxSchema = new Schema<OutboxDocument>(
  {
    _id: { type: String },
    persistent: { type: Boolean },
    headers: { type: Schema.Types.Mixed },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: null },
    occurredAt: { type: Date, required: true },
    publishedAt: { type: Date, default: null },
    correlationId: { type: String, required: true },
    aggregateType: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    eventType: { type: String, required: true, index: true },
    aggregateId: { type: String, required: true, index: true },
    status: {
      index: true,
      type: String,
      default: "pending",
      enum: ["pending", "claimed", "published", "failed"],
    },
    claimedBy: { type: String, default: null },
    claimedUntil: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

function toDocument(record: OutboxRecord): OutboxDocument {
  const { id, ...rest } = record;
  return { _id: id, ...rest, claimedUntil: null, claimedBy: null };
}

function fromDocument(doc: OutboxDocument): OutboxRecord {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, claimedUntil, claimedBy, ...rest } = doc;
  return { id: _id, ...rest } as OutboxRecord;
}

function claimableFilter(now: Date, maxAttempts: number) {
  return {
    $or: [
      { status: "pending" as const },
      { status: "failed" as const, attempts: { $lt: maxAttempts } },
      { status: "claimed" as const, claimedUntil: { $lt: now } },
    ],
  };
}

const DEFAULT_MAX_ATTEMPTS = 10;
const DEFAULT_LEASE_MS = 30 * SECOND;

export function createOutboxRepository(
  connection: Connection,
  options?: { leaseMs?: number; workerId?: string; maxAttempts?: number },
): IOutboxRepository {
  const workerId = options?.workerId ?? randomUUID();
  const leaseMs = options?.leaseMs ?? DEFAULT_LEASE_MS;
  const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  const OutboxModel: Model<OutboxDocument> =
    (connection.models.Outbox as Model<OutboxDocument>) ||
    connection.model<OutboxDocument>("Outbox", outboxSchema);

  return {
    async save(record, session) {
      await OutboxModel.create([toDocument(record)], { session });
    },

    async claimBatch(limit) {
      const now = new Date();

      /** Cheap, non-atomic candidate selection. */
      const candidates = await OutboxModel.find(
        claimableFilter(now, maxAttempts),
      )
        .sort({ createdAt: 1 })
        .limit(limit)
        .select("_id")
        .lean<{ _id: string }[]>();

      const claimedUntil = new Date(Date.now() + leaseMs);
      const claimed: OutboxDocument[] = [];

      /** skipped claimed: Atomic per document race for each candidate. */
      for (const { _id } of candidates) {
        const doc = await OutboxModel.findOneAndUpdate(
          { _id, ...claimableFilter(new Date(), maxAttempts) },
          { $set: { status: "claimed", claimedUntil, claimedBy: workerId } },
          { returnDocument: "after" },
        );
        if (doc) claimed.push(doc);
      }

      return claimed.map(fromDocument);
    },

    async markPublished(id) {
      await OutboxModel.updateOne(
        { _id: id, claimedBy: workerId },
        { status: "published", publishedAt: new Date() },
      );
    },

    async markFailed(id, error) {
      await OutboxModel.updateOne(
        { _id: id, claimedBy: workerId },
        { status: "failed", lastError: error, $inc: { attempts: 1 } },
      );
    },

    async fetchDeadLettered(limit) {
      const docs = await OutboxModel.find({
        status: "failed",
        attempts: { $gte: maxAttempts },
      })
        .sort({ createdAt: 1 })
        .limit(limit)
        .lean<OutboxDocument[]>();
      return docs.map(fromDocument);
    },
  };
}
