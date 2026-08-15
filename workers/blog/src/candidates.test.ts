import type { BlogCandidateDetailRow } from "@lkmlens/db";
import type { Digest } from "@lkmlens/shared";
import { describe, expect, it } from "vitest";
import { rankBlogCandidates } from "./candidates.js";

const digest: Digest = {
  id: 1,
  periodType: "weekly",
  periodKey: "2026-W33",
  title: "Weekly",
  sourceThreadIds: [10, 20],
  generatedAt: "2026-08-16T00:00:00Z",
  publishedAt: "2026-08-16T00:00:00Z",
  content: {
    mostActiveTopics: [],
    threads: [
      { threadId: 10, subject: "Busy RFC", sourceUrl: "https://lore/10", topicNames: ["Scheduler"], messageCount: 100, lastActivityAt: null, overview: "A proposal", overviewEvidence: [{ messageId: "m10", sourceUrl: "https://lore/m10" }] },
      { threadId: 20, subject: "Mainline change", sourceUrl: "https://lore/20", topicNames: ["GPU"], messageCount: 4, lastActivityAt: null, overview: "Observed in mainline", overviewEvidence: [{ messageId: "m20", sourceUrl: "https://lore/m20" }] },
    ],
  },
};

function detail(overrides: Partial<BlogCandidateDetailRow>): BlogCandidateDetailRow {
  return {
    threadId: 10,
    seriesId: null,
    patchVersion: null,
    vendorsJson: "[]",
    affectedLayersJson: "[]",
    likelyStakeholdersJson: "[]",
    suggestedAction: null,
    explicitReviewCount: 0,
    maintainerTreeUrl: null,
    mainlineCommitUrl: null,
    linuxVersion: null,
    stableVersionsJson: "[]",
    androidCommonBranchesJson: "[]",
    lifecycleSourceUrlsJson: "[]",
    sourceExcerpt: null,
    ...overrides,
  };
}

describe("weekly blog candidate ranking", () => {
  it("ranks observed lifecycle evidence above raw thread activity", () => {
    const ranked = rankBlogCandidates(digest, [
      detail({ threadId: 10 }),
      detail({ threadId: 20, mainlineCommitUrl: "https://git/commit", vendorsJson: '["AMD"]', affectedLayersJson: '["GPU"]' }),
    ]);
    expect(ranked[0]).toMatchObject({ threadId: 20, observedStage: "mainline" });
    expect(ranked[0]?.evidenceUrls).toContain("https://git/commit");
  });

  it("handles malformed optional JSON as empty evidence", () => {
    const ranked = rankBlogCandidates(digest, [detail({ threadId: 10, vendorsJson: "not-json" })]);
    expect(ranked.find((item) => item.threadId === 10)?.vendors).toEqual([]);
  });

  it("uses a bounded root-message excerpt when a digest has no AI overview", () => {
    const withoutOverviews: Digest = {
      ...digest,
      content: {
        ...digest.content,
        threads: digest.content.threads.map((thread) => ({ ...thread, overview: null, overviewEvidence: [] })),
      },
    };
    const ranked = rankBlogCandidates(withoutOverviews, [
      detail({ threadId: 10, sourceExcerpt: `  ${"e".repeat(4_100)}  ` }),
    ]);
    expect(ranked.find((item) => item.threadId === 10)?.overview).toHaveLength(4_000);
  });

  it("keeps only the newest revision of one patch series and reassigns compact source IDs", () => {
    const withTwoRevisions: Digest = {
      ...digest,
      content: {
        ...digest.content,
        threads: [
          digest.content.threads[0]!,
          {
            ...digest.content.threads[0]!,
            threadId: 30,
            subject: "[PATCH v10] Busy RFC",
            sourceUrl: "https://lore/30",
            overview: "A newer proposal",
          },
          digest.content.threads[1]!,
        ],
      },
    };
    const ranked = rankBlogCandidates(withTwoRevisions, [
      detail({ threadId: 10, seriesId: 7, patchVersion: 9 }),
      detail({ threadId: 30, seriesId: 7, patchVersion: 10 }),
      detail({ threadId: 20, mainlineCommitUrl: "https://git/commit" }),
    ]);
    expect(ranked.map((item) => item.threadId)).not.toContain(10);
    expect(ranked.map((item) => item.threadId)).toContain(30);
    expect(ranked.map((item) => item.sourceId)).toEqual(["s1", "s2"]);
  });
});
