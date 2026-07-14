export type LexicalSentiment = {
  label: "positive" | "neutral" | "negative";
  score: number;
  confidence: number;
};

export type LexicalBrandMatch = {
  brand: string;
  mentionText: string;
  confidence: number;
  relevance: number;
};

const DEFAULT_POSITIVE = ["love", "great", "awesome", "good", "amazing", "best"];
const DEFAULT_NEGATIVE = ["hate", "terrible", "awful", "bad", "worst", "suck"];
const DEFAULT_BRANDS = ["Acme", "NovaEnergy", "PulsePay"];

/**
 * Lexical/rule-based fallback used when ML sentiment or brand-relevance fails
 * or returns low confidence — keeps the pipeline producing scores instead of dropping events.
 */
export function lexicalAnalyzeSentiment(
  text: string,
  lexicons?: { positive?: string[]; negative?: string[] },
): LexicalSentiment {
  const tokens = tokenize(text);
  const positive = new Set((lexicons?.positive ?? DEFAULT_POSITIVE).map((w) => w.toLowerCase()));
  const negative = new Set((lexicons?.negative ?? DEFAULT_NEGATIVE).map((w) => w.toLowerCase()));

  let pos = 0;
  let neg = 0;
  for (const token of tokens) {
    if (positive.has(token)) pos += 1;
    if (negative.has(token)) neg += 1;
  }

  if (pos === 0 && neg === 0) {
    return { label: "neutral", score: 0, confidence: 0.4 };
  }

  const raw = (pos - neg) / (pos + neg);
  const score = Math.max(-1, Math.min(1, raw));
  const label = score > 0.15 ? "positive" : score < -0.15 ? "negative" : "neutral";
  return { label, score, confidence: 0.5 };
}

export function lexicalDetectBrands(
  text: string,
  brands: string[] = DEFAULT_BRANDS,
): LexicalBrandMatch[] {
  const matches: LexicalBrandMatch[] = [];
  const lower = text.toLowerCase();

  for (const brand of brands) {
    const idx = lower.indexOf(brand.toLowerCase());
    if (idx >= 0) {
      matches.push({
        brand,
        mentionText: text.slice(idx, idx + brand.length),
        confidence: 0.6,
        relevance: 0.7,
      });
    }
  }

  return matches;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}
