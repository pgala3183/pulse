export interface SentimentCache {
  setLatest(streamId: string, payload: Record<string, unknown>): Promise<void>;
  getLatest(streamId: string): Promise<Record<string, unknown> | null>;
}

/** In-memory stand-in for Redis low-latency reads. */
export class InMemorySentimentCache implements SentimentCache {
  private readonly store = new Map<string, Record<string, unknown>>();

  async setLatest(streamId: string, payload: Record<string, unknown>): Promise<void> {
    this.store.set(streamId, payload);
  }

  async getLatest(streamId: string): Promise<Record<string, unknown> | null> {
    return this.store.get(streamId) ?? null;
  }
}
