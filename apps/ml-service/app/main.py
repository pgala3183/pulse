"""Pulse ML service — sentiment, sponsor detection, and transcription."""

from fastapi import FastAPI

app = FastAPI(
    title="Pulse ML Service",
    description="Sentiment analysis, sponsor/brand-mention detection, and transcription",
    version="0.0.0",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
