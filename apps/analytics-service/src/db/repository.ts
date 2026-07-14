export type StoredRollup = {
  id: string;
  platform: string;
  streamId: string;
  windowType: string;
  windowStart: string;
  windowEnd: string;
  metrics: Record<string, unknown>;
  updatedAt: string;
};

export interface AnalyticsRepository {
  upsertRollup(row: StoredRollup): Promise<void>;
  listByStream(streamId: string): Promise<StoredRollup[]>;
}

export class InMemoryAnalyticsRepository implements AnalyticsRepository {
  private readonly rows = new Map<string, StoredRollup>();

  async upsertRollup(row: StoredRollup): Promise<void> {
    this.rows.set(row.id, row);
  }

  async listByStream(streamId: string): Promise<StoredRollup[]> {
    return [...this.rows.values()].filter((row) => row.streamId === streamId);
  }
}
