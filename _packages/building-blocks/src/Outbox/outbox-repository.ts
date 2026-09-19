import { OutboxRecord } from "./types.js";
import type { ClientSession } from "mongoose";

export interface IOutboxRepository {
  /** Called inside the SAME session/transaction as the business write. */
  save(record: OutboxRecord, session?: ClientSession): Promise<void>;
  markPublished(id: string): Promise<void>;

  /**
   Atomically claims up to `limit` publishable rows for THIS repository instance: pending (fresh), failed (retry immediately), or claimed with an expired lease (a previous publisher crashed mid batch).

   Claimed rows are invisible to other concurrent claimBatch calls until
   the lease expires. May return fewer than `limit` rows if candidates
   lost the race to another publisher instance. this is expected, not
   an error.
   */
  claimBatch(limit: number): Promise<OutboxRecord[]>;
  markFailed(id: string, error: string): Promise<void>;

  /**
   Rows that have failed at least maxAttempts times the outbox's own
   dead-letter view.
  */
  fetchDeadLettered(limit: number): Promise<OutboxRecord[]>;
}
