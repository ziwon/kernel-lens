import { BLOG_POST_SCHEMA, BLOG_PROMPT_VERSION, type BlogProvider, type ProviderGeneration } from "@lkmlens/ai";
import { BlogApiError } from "./error.js";

interface GrokResponse {
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

export function createGrokBlogProvider(apiKey: string, model: string): BlogProvider {
  return {
    model,
    async generateJson(prompt): Promise<ProviderGeneration> {
      const response = await fetch("https://api.x.ai/v1/responses", {
        method: "POST",
        headers: {
          "authorization": `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: prompt,
          store: false,
          reasoning: { effort: "high" },
          max_output_tokens: 8_192,
          prompt_cache_key: BLOG_PROMPT_VERSION,
          text: {
            format: {
              type: "json_schema",
              name: "kernel_lens_weekly",
              schema: BLOG_POST_SCHEMA,
              strict: true,
            },
          },
        }),
        signal: AbortSignal.timeout(420_000),
      });
      if (!response.ok) {
        const body = (await response.text()).slice(0, 1_000);
        throw new BlogApiError(`xAI API ${response.status}: ${body}`, response.status, response.status === 429);
      }
      const result = await response.json<GrokResponse>();
      const text = result.output
        ?.filter((item) => item.type === "message")
        .flatMap((item) => item.content ?? [])
        .find((item) => item.type === "output_text")?.text;
      if (!text) throw new BlogApiError("xAI API returned no output_text", 502, false);
      try {
        return {
          data: JSON.parse(text) as unknown,
          inputTokens: result.usage?.input_tokens ?? result.usage?.prompt_tokens ?? 0,
          outputTokens: result.usage?.output_tokens ?? result.usage?.completion_tokens ?? 0,
        };
      } catch {
        throw new BlogApiError("xAI API returned invalid JSON", 502, false);
      }
    },
  };
}
