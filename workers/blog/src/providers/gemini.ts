import { BLOG_POST_SCHEMA, type BlogProvider } from "@lkmlens/ai";
import type { ProviderGeneration } from "@lkmlens/ai";
import { BlogApiError } from "./error.js";

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

export function createGeminiBlogProvider(apiKey: string, model: string): BlogProvider {
  return {
    model,
    async generateJson(prompt): Promise<ProviderGeneration> {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 8_192,
              responseMimeType: "application/json",
              responseJsonSchema: BLOG_POST_SCHEMA,
            },
          }),
          signal: AbortSignal.timeout(120_000),
        },
      );
      if (!response.ok) {
        const body = (await response.text()).slice(0, 1_000);
        throw new BlogApiError(`Gemini API ${response.status}: ${body}`, response.status, response.status === 429);
      }
      const result = await response.json() as GeminiResponse;
      const text = result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
      if (!text) throw new BlogApiError("Gemini API returned no text candidate", 502, false);
      try {
        return {
          data: JSON.parse(text) as unknown,
          inputTokens: result.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: result.usageMetadata?.candidatesTokenCount ?? 0,
        };
      } catch {
        throw new BlogApiError("Gemini API returned invalid JSON", 502, false);
      }
    },
  };
}
