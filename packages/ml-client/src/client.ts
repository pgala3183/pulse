export type SentimentLabel = "positive" | "neutral" | "negative";

export type SentimentAnalysisRequest = {
  text: string;
  platform?: "twitch" | "youtube";
};

export type SentimentAnalysisResponse = {
  label: SentimentLabel;
  /** Continuous score in [-1, 1]. */
  score: number;
  confidence: number;
};

export type BrandRelevanceRequest = {
  text: string;
  brands?: string[];
};

export type BrandRelevanceMatch = {
  brand: string;
  mentionText: string;
  confidence: number;
  /** How strongly the surrounding context is brand/sponsor related, [0, 1]. */
  relevance: number;
};

export type BrandRelevanceResponse = {
  matches: BrandRelevanceMatch[];
  confidence: number;
};

export type SponsorDetectionRequest = {
  streamId: string;
  frameId: string;
  payloadRef: string;
  mimeType: string;
};

export type SponsorDetection = {
  brand: string;
  mentionText: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type SponsorDetectionResponse = {
  detections: SponsorDetection[];
  confidence: number;
};

export type MlClientOptions = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Confidence below this threshold should trigger lexical fallbacks upstream. */
  lowConfidenceThreshold?: number;
};

export class MlClientError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "MlClientError";
  }
}

export class MlClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  readonly lowConfidenceThreshold: number;

  constructor(options: MlClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 5_000;
    this.lowConfidenceThreshold = options.lowConfidenceThreshold ?? 0.45;
  }

  isLowConfidence(confidence: number): boolean {
    return confidence < this.lowConfidenceThreshold;
  }

  async analyzeSentiment(request: SentimentAnalysisRequest): Promise<SentimentAnalysisResponse> {
    return this.post<SentimentAnalysisResponse>("/v1/sentiment", request);
  }

  async analyzeBrandRelevance(
    request: BrandRelevanceRequest,
  ): Promise<BrandRelevanceResponse> {
    return this.post<BrandRelevanceResponse>("/v1/brand-relevance", request);
  }

  async detectSponsors(request: SponsorDetectionRequest): Promise<SponsorDetectionResponse> {
    return this.post<SponsorDetectionResponse>("/v1/sponsor-detection", request);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new MlClientError(
        `ML request to ${path} failed`,
        undefined,
        error instanceof Error ? error : new Error(String(error)),
      );
    }

    if (!response.ok) {
      throw new MlClientError(`ML request to ${path} returned ${String(response.status)}`, response.status);
    }

    return (await response.json()) as T;
  }
}
