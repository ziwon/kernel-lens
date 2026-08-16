import { describe, expect, it } from "vitest";
import {
  BLOG_PROMPT_VERSION,
  buildBlogPrompt,
  generateWeeklyBlogPost,
  validateBlogPostContent,
  weeklyPeriodRange,
  type BlogCandidate,
} from "./blog.js";

const valid = {
  title: "Two kernel changes product teams should track",
  dek: "A review of scheduler and device-management work with concrete integration consequences.",
  lead: { text: "Two active threads expose upcoming integration work.", sourceIds: ["s1", "s2"] },
  sections: [
    {
      heading: "Scheduler interfaces move",
      paragraphs: [
        { text: "The scheduler proposal changes an interface used by tooling.", sourceIds: ["s1"] },
        { text: "Tooling teams should isolate that interface in their next validation pass.", sourceIds: ["s1"] },
      ],
    },
    {
      heading: "Device management follows",
      paragraphs: [
        { text: "The device-management series adds a new review point.", sourceIds: ["s2"] },
        { text: "Platform teams should verify the affected device path before planning adoption.", sourceIds: ["s2"] },
      ],
    },
  ],
  watchItems: [
    { text: "Watch for a revised scheduler posting.", sourceIds: ["s1"] },
    { text: "Watch for additional device-management review.", sourceIds: ["s2"] },
  ],
};

function candidate(overrides: Partial<BlogCandidate>): BlogCandidate {
  return {
    sourceId: "s1",
    threadId: 1,
    seriesId: null,
    patchVersion: null,
    subject: "A",
    sourceUrl: "a",
    evidenceUrls: ["a1"],
    topicNames: [],
    overview: "A",
    messageCount: 2,
    lastActivityAt: null,
    vendors: [],
    affectedLayers: [],
    likelyStakeholders: [],
    suggestedAction: null,
    explicitReviewCount: 0,
    observedStage: "submitted",
    ...overrides,
  };
}

describe("weekly evidence-linked blog posts", () => {
  it("accepts prose only when every paragraph references known sources", () => {
    const result = validateBlogPostContent(valid, new Set(["s1", "s2"]));
    expect(result.content.sections).toHaveLength(2);
  });

  it("rejects a model-invented source", () => {
    const bad = { ...valid, lead: { text: "Unsupported.", sourceIds: ["s3"] } };
    expect(() => validateBlogPostContent(bad, new Set(["s1", "s2"]))).toThrow("unknown source");
  });

  it("rejects prose containing model-generated URLs", () => {
    const bad = { ...valid, lead: { text: "Read https://example.com for details.", sourceIds: ["s1"] } };
    expect(() => validateBlogPostContent(bad, new Set(["s1", "s2"]))).toThrow("must not contain URLs");
  });

  it("requires the evidence and consequence paragraph pair in every section", () => {
    const bad = {
      ...valid,
      sections: [{ ...valid.sections[0], paragraphs: [valid.sections[0]?.paragraphs[0]] }, valid.sections[1]],
    };
    expect(() => validateBlogPostContent(bad, new Set(["s1", "s2"]))).toThrow("exactly 2 paragraphs");
  });

  it("rejects an overlong watch item", () => {
    const bad = {
      ...valid,
      watchItems: [{ text: Array.from({ length: 61 }, () => "watch").join(" "), sourceIds: ["s1"] }, valid.watchItems[1]],
    };
    expect(() => validateBlogPostContent(bad, new Set(["s1", "s2"]))).toThrow("exceeds 60 words");
  });

  it("converts an ISO week into an explicit UTC evidence window", () => {
    expect(weeklyPeriodRange("2026-W31")).toEqual({ start: "2026-07-27", end: "2026-08-02" });
    expect(weeklyPeriodRange("2026-W54")).toBeNull();
    const prompt = buildBlogPrompt("2026-W31", [
      candidate({ sourceId: "s1" }),
      candidate({ sourceId: "s2", threadId: 2, subject: "B" }),
    ], "en");
    expect(prompt).toContain("2026-07-27 through 2026-08-02 UTC");
    expect(prompt).toContain("Do not summarize a series patch by patch");
  });

  it("uses topic and vendor metadata to prioritize AI infrastructure focus areas", () => {
    const prompt = buildBlogPrompt("2026-W31", [
      candidate({
        topicNames: ["eBPF core"],
        vendors: ["NVIDIA"],
        affectedLayers: ["Kernel BPF core / verifier"],
      }),
      candidate({ sourceId: "s2", threadId: 2 }),
    ], "en");
    expect(BLOG_PROMPT_VERSION).toBe("kernel-lens-weekly-v3");
    expect(prompt).toContain("Treat topicNames as technical-domain signals and vendors as implementation or product-impact signals");
    expect(prompt).toContain("GPU and accelerator infrastructure");
    expect(prompt).toContain("eBPF and observability");
    expect(prompt).toContain("use a watchItem as a domain radar checkpoint");
    expect(prompt).toContain('"topicNames":["eBPF core"]');
    expect(prompt).toContain('"vendors":["NVIDIA"]');
  });

  it("returns provider usage with validated content", async () => {
    const result = await generateWeeklyBlogPost(
      { model: "test-model", generateJson: async () => ({ data: valid, inputTokens: 21, outputTokens: 34 }) },
      "2026-W32",
      [
        candidate({ sourceId: "s1" }),
        candidate({ sourceId: "s2", threadId: 2, subject: "B", sourceUrl: "b", evidenceUrls: ["b1"], overview: "B", messageCount: 3 }),
      ],
      "en",
    );
    expect(result).toMatchObject({ title: valid.title, model: "test-model", promptVersion: BLOG_PROMPT_VERSION, inputTokens: 21, outputTokens: 34 });
  });
});
