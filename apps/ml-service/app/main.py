"""Pulse ML service — sentiment, sponsor detection, and transcription."""

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(
    title="Pulse ML Service",
    description="Sentiment analysis, sponsor/brand-mention detection, and transcription",
    version="0.0.0",
)


class SentimentRequest(BaseModel):
    text: str
    platform: str | None = None


class BrandRelevanceRequest(BaseModel):
    text: str
    brands: list[str] | None = None


class SponsorDetectionRequest(BaseModel):
    stream_id: str = Field(alias="streamId")
    frame_id: str = Field(alias="frameId")
    payload_ref: str = Field(alias="payloadRef")
    mime_type: str = Field(alias="mimeType")

    model_config = {"populate_by_name": True}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/sentiment")
def sentiment(body: SentimentRequest) -> dict[str, object]:
    # Stub — real models land later. Echo a naïve lexical score.
    lowered = body.text.lower()
    positive = sum(w in lowered for w in ("love", "great", "good", "awesome"))
    negative = sum(w in lowered for w in ("hate", "terrible", "awful", "bad"))
    if positive == negative:
        return {"label": "neutral", "score": 0.0, "confidence": 0.55}
    score = (positive - negative) / (positive + negative)
    label = "positive" if score > 0 else "negative"
    return {"label": label, "score": score, "confidence": 0.7}


@app.post("/v1/brand-relevance")
def brand_relevance(body: BrandRelevanceRequest) -> dict[str, object]:
    brands = body.brands or ["Acme", "NovaEnergy", "PulsePay"]
    matches = []
    for brand in brands:
        idx = body.text.lower().find(brand.lower())
        if idx >= 0:
            matches.append(
                {
                    "brand": brand,
                    "mentionText": body.text[idx : idx + len(brand)],
                    "confidence": 0.8,
                    "relevance": 0.85,
                }
            )
    return {"matches": matches, "confidence": 0.8 if matches else 0.5}


@app.post("/v1/sponsor-detection")
def sponsor_detection(body: SponsorDetectionRequest) -> dict[str, object]:
    haystack = f"{body.payload_ref} {body.frame_id}".lower()
    detections = []
    for brand in ("Acme", "NovaEnergy", "PulsePay"):
        if brand.lower() in haystack:
            detections.append(
                {
                    "brand": brand,
                    "mentionText": brand,
                    "confidence": 0.88,
                }
            )
    return {"detections": detections, "confidence": 0.88 if detections else 0.3}
