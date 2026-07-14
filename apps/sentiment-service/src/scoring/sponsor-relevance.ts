/**
 * Sponsor-relevance scoring for live chat / transcript moments.
 *
 * Formula (see docs/adr/0003-sponsor-relevance-scoring.md):
 *
 *   R = w_s * S' + w_k * K + w_p * P
 *
 * where:
 * - S' = sentiment mapped from [-1,1] → [0,1], lightly boosted when a brand match exists
 * - K  = max(brandMatch.confidence * brandMatch.relevance)
 * - P  = 1 when the chat kind is Super Chat / membership, else 0
 *
 * Default weights emphasize explicit brand evidence (K) while still valuing paid
 * attention (P) — the YouTube-only signal Twitch chat lacks.
 */

export const SPONSOR_RELEVANCE_WEIGHTS = {
  sentiment: 0.35,
  keyword: 0.4,
  paid: 0.25,
} as const;

export type BrandMatchSignal = {
  brand: string;
  confidence: number;
  relevance: number;
};

export type SponsorRelevanceInput = {
  sentimentScore: number;
  brandMatches: BrandMatchSignal[];
  /** True for Super Chat / membership (and similar paid chat kinds). */
  isPaidSignal: boolean;
  weights?: {
    sentiment: number;
    keyword: number;
    paid: number;
  };
};

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function mapSentimentToUnitInterval(score: number): number {
  return clamp01((score + 1) / 2);
}

export function computeSponsorRelevance(input: SponsorRelevanceInput): number {
  const weights = input.weights ?? SPONSOR_RELEVANCE_WEIGHTS;
  const hasBrand = input.brandMatches.length > 0;
  const sentimentComponent = mapSentimentToUnitInterval(input.sentimentScore) * (hasBrand ? 1 : 0.65);

  const keywordComponent =
    input.brandMatches.length === 0
      ? 0
      : Math.max(
          ...input.brandMatches.map((match) => clamp01(match.confidence * match.relevance)),
        );

  const paidComponent = input.isPaidSignal ? 1 : 0;

  return clamp01(
    weights.sentiment * sentimentComponent +
      weights.keyword * keywordComponent +
      weights.paid * paidComponent,
  );
}

export function isPaidChatKind(kind: string | undefined): boolean {
  return kind === "super_chat" || kind === "membership";
}
