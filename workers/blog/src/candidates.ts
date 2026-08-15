import type { BlogCandidate } from "@lkmlens/ai";
import type { BlogCandidateDetailRow } from "@lkmlens/db";
import type { Digest } from "@lkmlens/shared";

function stringArray(json: string): string[] {
  try {
    const value = JSON.parse(json) as unknown;
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function observedStage(detail: BlogCandidateDetailRow | undefined): string {
  if (!detail) return "submitted";
  if (stringArray(detail.androidCommonBranchesJson).length > 0) return "android-common";
  if (stringArray(detail.stableVersionsJson).length > 0) return "stable-backport";
  if (detail.linuxVersion) return "released";
  if (detail.mainlineCommitUrl) return "mainline";
  if (detail.maintainerTreeUrl) return "maintainer-tree";
  return detail.explicitReviewCount > 0 ? "under-review" : "submitted";
}

const STAGE_SCORE: Record<string, number> = {
  "android-common": 34,
  "stable-backport": 32,
  released: 30,
  mainline: 26,
  "maintainer-tree": 20,
  "under-review": 10,
  submitted: 4,
};

function score(candidate: BlogCandidate): number {
  return (candidate.overview ? 24 : 0)
    + Math.min(candidate.evidenceUrls.length, 4) * 6
    + (STAGE_SCORE[candidate.observedStage] ?? 0)
    + Math.min(candidate.explicitReviewCount, 3) * 4
    + Math.min(candidate.vendors.length, 2) * 3
    + Math.min(candidate.affectedLayers.length, 2) * 3
    + Math.min(8, Math.log2(candidate.messageCount + 1));
}

function evidenceOverview(threadOverview: string | null, detail: BlogCandidateDetailRow | undefined): string | null {
  if (threadOverview?.trim()) return threadOverview.trim();
  const excerpt = detail?.sourceExcerpt?.trim();
  return excerpt ? excerpt.slice(0, 4_000) : null;
}

export function rankBlogCandidates(
  digest: Digest,
  details: BlogCandidateDetailRow[],
  limit = 5,
): BlogCandidate[] {
  const detailsByThread = new Map(details.map((detail) => [detail.threadId, detail]));
  const candidates = digest.content.threads.map((thread): BlogCandidate => {
    const detail = detailsByThread.get(thread.threadId);
    const evidenceUrls = Array.from(new Set([
      thread.sourceUrl,
      ...thread.overviewEvidence.map((evidence) => evidence.sourceUrl),
      ...(detail?.maintainerTreeUrl ? [detail.maintainerTreeUrl] : []),
      ...(detail?.mainlineCommitUrl ? [detail.mainlineCommitUrl] : []),
      ...stringArray(detail?.lifecycleSourceUrlsJson ?? "[]"),
    ]));
    return {
      sourceId: "",
      threadId: thread.threadId,
      seriesId: detail?.seriesId ?? null,
      patchVersion: detail?.patchVersion ?? null,
      subject: thread.subject,
      sourceUrl: thread.sourceUrl,
      evidenceUrls,
      topicNames: thread.topicNames,
      // Older digests predate AI summaries. Their root cover letters are
      // still primary evidence, so use a bounded excerpt instead of dropping
      // the candidate or asking the model to infer from a subject alone.
      overview: evidenceOverview(thread.overview, detail),
      messageCount: thread.messageCount,
      lastActivityAt: thread.lastActivityAt,
      vendors: stringArray(detail?.vendorsJson ?? "[]"),
      affectedLayers: stringArray(detail?.affectedLayersJson ?? "[]"),
      likelyStakeholders: stringArray(detail?.likelyStakeholdersJson ?? "[]"),
      suggestedAction: detail?.suggestedAction ?? null,
      explicitReviewCount: detail?.explicitReviewCount ?? 0,
      observedStage: observedStage(detail),
    };
  });

  const standalone: BlogCandidate[] = [];
  const latestBySeries = new Map<number, BlogCandidate>();
  for (const candidate of candidates) {
    if (candidate.seriesId === null) {
      standalone.push(candidate);
      continue;
    }
    const current = latestBySeries.get(candidate.seriesId);
    if (!current
      || (candidate.patchVersion ?? 0) > (current.patchVersion ?? 0)
      || ((candidate.patchVersion ?? 0) === (current.patchVersion ?? 0) && score(candidate) > score(current))) {
      latestBySeries.set(candidate.seriesId, candidate);
    }
  }

  return [...standalone, ...latestBySeries.values()]
    .sort((left, right) => score(right) - score(left) || left.threadId - right.threadId)
    .slice(0, Math.max(1, limit))
    .map((candidate, index) => ({ ...candidate, sourceId: `s${index + 1}` }));
}
