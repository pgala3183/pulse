export type DetectionRecord = {
  id: string;
  eventId: string;
  streamId: string;
  platform: string;
  frameId: string;
  brand: string;
  mentionText: string;
  confidence: number;
  analysisSource: string;
  payload: Record<string, unknown>;
};

export interface SponsorDetectionRepository {
  insert(row: DetectionRecord): Promise<void>;
  listByStream(streamId: string): Promise<DetectionRecord[]>;
}

/** In-memory store used by tests and local runs without Postgres. */
export class InMemorySponsorDetectionRepository implements SponsorDetectionRepository {
  private readonly rows: DetectionRecord[] = [];

  async insert(row: DetectionRecord): Promise<void> {
    this.rows.push(row);
  }

  async listByStream(streamId: string): Promise<DetectionRecord[]> {
    return this.rows.filter((row) => row.streamId === streamId);
  }
}
