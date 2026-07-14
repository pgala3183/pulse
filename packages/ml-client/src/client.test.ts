import { describe, expect, it, vi } from "vitest";
import { MlClient, MlClientError } from "./client";

describe("MlClient", () => {
  it("posts sentiment requests to the FastAPI path", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ label: "positive", score: 0.8, confidence: 0.9 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new MlClient({
      baseUrl: "http://ml.local",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await client.analyzeSentiment({ text: "great" });
    expect(result.label).toBe("positive");
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://ml.local/v1/sentiment",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("wraps transport failures as MlClientError", async () => {
    const client = new MlClient({
      baseUrl: "http://ml.local",
      fetchImpl: (async () => {
        throw new Error("boom");
      }) as unknown as typeof fetch,
    });

    await expect(client.detectSponsors({
      streamId: "s",
      frameId: "f",
      payloadRef: "ref",
      mimeType: "image/jpeg",
    })).rejects.toBeInstanceOf(MlClientError);
  });
});
