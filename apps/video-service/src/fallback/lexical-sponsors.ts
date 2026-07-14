export type LexicalSponsorHit = {
  brand: string;
  mentionText: string;
  confidence: number;
};

const DEFAULT_BRANDS = ["Acme", "NovaEnergy", "PulsePay"];

/**
 * Rule-based OCR/metadata fallback: scan free text (payload refs, captions, OCR dumps)
 * for known brand tokens when the ML sponsor detector fails or is low-confidence.
 */
export function lexicalDetectSponsors(
  text: string,
  brands: string[] = DEFAULT_BRANDS,
): LexicalSponsorHit[] {
  const hits: LexicalSponsorHit[] = [];
  const lower = text.toLowerCase();

  for (const brand of brands) {
    const idx = lower.indexOf(brand.toLowerCase());
    if (idx >= 0) {
      hits.push({
        brand,
        mentionText: text.slice(idx, idx + brand.length),
        confidence: 0.55,
      });
    }
  }

  return hits;
}
