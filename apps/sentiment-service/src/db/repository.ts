export type SentimentRecord = {
  id: string;
  eventId: string;
  streamId: string;
  platform: string;
  sourceEventId: string;
  sourceType: string;
  label: string;
  score: number;
  confidence: number;
  sponsorRelevance: number | null;
  analysisSource: string;
  payload: Record<string, unknown>;
};

export interface SentimentRepository {
  insert(row: SentimentRecord): Promise<void>;
  listByStream(streamId: string): Promise<SentimentRecord[]>;
}

export class InMemorySentimentRepository implements SentimentRepository {
  private readonly rows: SentimentRecord[] = [];

  async insert(row: SentimentRecord): Promise<void> {
    this.rows.push(row);
  }

  async listByStream(streamId: string): Promise<SentimentRecord[]> {
    return this.rows.filter((row) => row.streamId === streamId);
  }
}
