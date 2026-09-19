import { ClientSession } from "mongoose";
import { InboxRecord } from "./types.js";

export interface IInboxRepository {
  /**
   * Atomically claims a message for processing. Three outcomes:
   *  - never seen before          -> inserted fresh, returns true
   *  - previously "failed"        -> reset to "received", returns true
   *    (this is what makes retries work: a redelivery carries the SAME
   *    messageId, and it must be allowed to re-claim, not rejected as
   *    a duplicate)
   *  - "received" or "processed"  -> untouched, returns false
   *    (still in flight, or already done - a genuine duplicate delivery)
   *
   * Backed by a single findOneAndUpdate+upsert filtered on status:"failed",
   * plus the unique index on `messageId` for the reject case - not a
   * plain insert, which can't tell "retry" and "duplicate" apart.
   *
   * Known gap: a crash mid-processing leaves a record stuck at "received"
   * forever, since nothing ever transitions it to "failed". A genuine
   * broker redelivery of that same message would be rejected as if it
   * were still in flight. Needs a separate reaper (e.g. "received" older
   * than N minutes -> treat as failed) - not handled here.
   */
  tryClaim(record: InboxRecord, session?: ClientSession): Promise<boolean>;
  markProcessed(messageId: string, session?: ClientSession): Promise<void>;
  markFailed(
    messageId: string,
    error: string,
    session?: ClientSession,
  ): Promise<void>;

  /** For a reaper/retry job over messages stuck in "failed". */
  fetchFailed(limit: number): Promise<InboxRecord[]>;
}
