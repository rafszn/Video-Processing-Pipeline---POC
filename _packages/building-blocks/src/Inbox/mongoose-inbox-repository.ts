import { MINUTE } from "../Time/index.js";
import { EventName } from "../Messaging/index.js";
import { Connection, Schema, Model } from "mongoose";
import { InboxRecord, InboxStatus } from "./types.js";
import { IInboxRepository } from "./inbox-repository.js";

interface InboxDocument {
  _id: string; // messageId
  receivedAt: Date;
  attempts: number;
  payload: unknown;
  status: InboxStatus;
  eventType: EventName;
  processedAt: Date | null;
  lastError: string | null;
}

const inboxSchema = new Schema<InboxDocument>(
  {
    _id: { type: String },
    attempts: { type: Number, default: 0 },
    receivedAt: { type: Date, required: true },
    processedAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    payload: { type: Schema.Types.Mixed, required: true },
    eventType: { type: String, required: true, index: true },
    status: {
      index: true,
      type: String,
      default: "received",
      enum: ["received", "processed", "failed"],
    },
  },
  { timestamps: false }, // receivedAt/processedAt already cover this
);

function fromDocument(doc: InboxDocument): InboxRecord {
  const { _id, ...rest } = doc;
  return { messageId: _id, ...rest } as InboxRecord;
}

const DEFAULT_STALE_AFTER_MS = 10 * MINUTE;

export function createInboxRepository(
  connection: Connection,
  options?: { staleAfterMs?: number },
): IInboxRepository {
  const InboxModel: Model<InboxDocument> =
    (connection.models.Inbox as Model<InboxDocument>) ||
    connection.model<InboxDocument>("Inbox", inboxSchema);
  const staleAfterMs = options?.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;

  return {
    async tryClaim(record, session) {
      const claimFields = {
        payload: record.payload,
        status: "received" as const,
        eventType: record.eventType,
        receivedAt: record.receivedAt,
      };

      try {
        await InboxModel.findOneAndUpdate(
          { _id: record.messageId, status: "failed" },
          { $set: { ...claimFields, lastError: null }, $inc: { attempts: 1 } },
          { upsert: true, session, returnDocument: "after" },
        );
        return true;
      } catch (err: unknown) {
        if (!isDuplicateKeyError(err)) throw err;
      }

      const staleBefore = new Date(Date.now() - staleAfterMs);
      const reclaimed = await InboxModel.findOneAndUpdate(
        {
          _id: record.messageId,
          status: "received",
          receivedAt: { $lt: staleBefore },
        },
        {
          $set: {
            ...claimFields,
            lastError:
              "reclaimed: previous attempt exceeded staleAfterMs without resolving",
          },
          $inc: { attempts: 1 },
        },
        { session, new: true },
      );
      return reclaimed !== null;
    },

    async markProcessed(messageId, session) {
      await InboxModel.updateOne(
        { _id: messageId },
        { status: "processed", processedAt: new Date() },
        { session },
      );
    },
    async markFailed(messageId, error, session) {
      await InboxModel.updateOne(
        { _id: messageId },
        { status: "failed", lastError: error },
        { session },
      );
    },
    async fetchFailed(limit) {
      const docs = await InboxModel.find({ status: "failed" })
        .limit(limit)
        .lean<InboxDocument[]>();
      return docs.map(fromDocument);
    },
  };
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: number }).code === 11000
  );
}
