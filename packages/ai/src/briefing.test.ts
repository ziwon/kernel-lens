import { describe, expect, it } from "vitest";
import {
  PATCH_BRIEFING_PROMPT_VERSION,
  buildPatchBriefingPrompt,
  generatePatchBriefing,
  type PatchBriefingEvidence,
} from "./briefing.js";

const evidence: PatchBriefingEvidence[] = [
  {
    sourceId: "s1",
    threadId: 9133,
    messageId: "cover",
    subject: "[PATCH v8 0/1] rust: introduce abstractions for fwctl",
    sourceUrl: "https://lore.example/cover",
    authorName: "Zhi Wang",
    postedAt: "2026-08-13T15:23:11Z",
    messageType: "cover_letter",
    excerpt: "The series introduces Rust abstractions for fwctl.",
  },
  {
    sourceId: "s2",
    threadId: 9133,
    messageId: "applied",
    subject: "Re: [PATCH v8 1/1] rust: introduce abstractions for fwctl",
    sourceUrl: "https://lore.example/applied",
    authorName: "Jason Gunthorpe",
    postedAt: "2026-08-14T22:47:46Z",
    messageType: "reply",
    excerpt: "Applied thanks.",
  },
];

const generated = {
  title: "Rust fwctl reaches its first maintainer-tree checkpoint",
  dek: "The v8 abstraction gives Rust drivers a typed path into the existing fwctl core.",
  lead: { text: "The v8 series reached an observed application checkpoint.", sourceIds: ["s1", "s2"] },
  sections: [
    {
      heading: "A control-plane use case drives the abstraction",
      paragraphs: [
        { text: "The cover letter identifies a firmware configuration use case.", sourceIds: ["s1"] },
        { text: "Driver teams should keep that path separate from device data-plane work.", sourceIds: ["s1"] },
      ],
    },
    {
      heading: "Typed callbacks contain the unsafe boundary",
      paragraphs: [
        { text: "The posting describes typed operations and registration lifetimes.", sourceIds: ["s1"] },
        { text: "Rust driver authors should validate those lifetime assumptions in consumers.", sourceIds: ["s1"] },
      ],
    },
    {
      heading: "Applied does not mean released",
      paragraphs: [
        { text: "A maintainer replied that the patch was applied.", sourceIds: ["s2"] },
        { text: "Release planners still need separate mainline and release evidence.", sourceIds: ["s2"] },
      ],
    },
  ],
  watchItems: [
    { text: "Watch for a mainline commit record.", sourceIds: ["s2"] },
    { text: "Watch for the first in-tree Rust consumer.", sourceIds: ["s1"] },
  ],
};

describe("Patch Briefing generation", () => {
  it("frames one series as a depth article with an explicit evidence cutoff", () => {
    const prompt = buildPatchBriefingPrompt({
      threadId: 9133,
      seriesId: 5293,
      patchVersion: 8,
      subject: evidence[0]!.subject,
      evidenceCutoff: "2026-08-14",
    }, evidence, "en");
    expect(prompt).toContain("This is a depth article, not a weekly roundup");
    expect(prompt).toContain("Never say fwctl was rewritten in Rust");
    expect(prompt).toContain("2026-08-14 UTC");
    expect(prompt).toContain('"messageId":"applied"');
  });

  it("uses the briefing prompt identity and validates three sections", async () => {
    const calls: Array<{ promptVersion: string; schemaName: string }> = [];
    const result = await generatePatchBriefing({
      model: "test-model",
      generateJson: async (_prompt, options) => {
        if (options) calls.push(options);
        return { data: generated, inputTokens: 10, outputTokens: 20 };
      },
    }, {
      threadId: 9133,
      seriesId: 5293,
      patchVersion: 8,
      subject: evidence[0]!.subject,
      evidenceCutoff: "2026-08-14",
    }, evidence, "en");
    expect(result.promptVersion).toBe(PATCH_BRIEFING_PROMPT_VERSION);
    expect(calls).toEqual([{
      promptVersion: PATCH_BRIEFING_PROMPT_VERSION,
      schemaName: "kernel_lens_patch_briefing",
    }]);
  });
});
