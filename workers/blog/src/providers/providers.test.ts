import { afterEach, describe, expect, it, vi } from "vitest";
import { createGeminiBlogProvider } from "./gemini.js";
import { createGrokBlogProvider } from "./grok.js";

afterEach(() => vi.unstubAllGlobals());

describe("weekly blog providers", () => {
  it("asks Gemini for schema-constrained JSON", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { generationConfig: Record<string, unknown> };
      expect(body.generationConfig.responseMimeType).toBe("application/json");
      expect(body.generationConfig.responseJsonSchema).toBeDefined();
      return Response.json({
        candidates: [{ content: { parts: [{ text: '{"title":"Weekly"}' }] } }],
        usageMetadata: { promptTokenCount: 80, candidatesTokenCount: 30 },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await createGeminiBlogProvider("gemini-secret", "gemini-test").generateJson("prompt");
    expect(result).toEqual({ data: { title: "Weekly" }, inputTokens: 80, outputTokens: 30 });
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ "x-goog-api-key": "gemini-secret" });
  });

  it("uses the xAI Responses API with strict structured output and no storage", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe("https://api.x.ai/v1/responses");
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body.store).toBe(false);
      expect(body.reasoning).toEqual({ effort: "high" });
      expect(body.text).toMatchObject({ format: { type: "json_schema", strict: true } });
      return Response.json({
        output: [{ type: "message", content: [{ type: "output_text", text: '{"title":"Weekly"}' }] }],
        usage: { input_tokens: 70, output_tokens: 25 },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await createGrokBlogProvider("grok-secret", "grok-test").generateJson("prompt");
    expect(result).toEqual({ data: { title: "Weekly" }, inputTokens: 70, outputTokens: 25 });
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ authorization: "Bearer grok-secret" });
  });

  it("marks provider rate limits as quota exhaustion", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("quota", { status: 429 })));
    await expect(createGrokBlogProvider("secret", "grok-test").generateJson("prompt"))
      .rejects.toMatchObject({ quotaExhausted: true, status: 429 });
  });
});
