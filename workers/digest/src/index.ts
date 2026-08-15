import { composeDigest, stripClaimMarkers } from "@lkmlens/ai";
import { getDigest, listDigestCandidates, upsertDigest } from "@lkmlens/db";
import type { SummaryContent } from "@lkmlens/shared";
import { dailyWindow, weeklyWindow, type DigestWindow } from "./period.js";

async function publishWindow(env: Env, window: DigestWindow): Promise<void> {
  const rows = await listDigestCandidates(env.DB, window.startInclusive, window.endExclusive);
  const candidates = rows.map((row) => {
    const summary = row.summaryJson ? JSON.parse(row.summaryJson) as SummaryContent : null;
    const overviewClaims = new Set(
      summary ? Array.from(summary.overview.matchAll(/\[(c\d+)\]/gi), (match) => match[1]?.toLowerCase()).filter(Boolean) : [],
    );
    return {
      threadId: row.threadId,
      subject: row.subject,
      sourceUrl: row.sourceUrl,
      messageCount: row.messageCount,
      lastActivityAt: row.lastActivityAt,
      topicSlugs: row.topicSlugs?.split("|").filter(Boolean) ?? [],
      topicNames: row.topicNames?.split("|").filter(Boolean) ?? [],
      overview: summary ? stripClaimMarkers(summary.overview) : null,
      overviewEvidence: summary
        ? summary.evidence
          .filter((item) => overviewClaims.has(item.claimId.toLowerCase()))
          .map(({ messageId, sourceUrl }) => ({ messageId, sourceUrl }))
        : [],
    };
  });
  const content = composeDigest(candidates);
  await upsertDigest(env.DB, window.periodType, window.periodKey, window.title, content);
  console.log(JSON.stringify({ event: "digest_published", period: window.periodKey, threads: content.threads.length }));
}

async function publishDigests(env: Env, now: Date): Promise<void> {
  await publishWindow(env, dailyWindow(now));
  const weekly = weeklyWindow(now);
  const existingWeekly = await getDigest(env.DB, "weekly", weekly.periodKey);
  if (existingWeekly) {
    console.log(JSON.stringify({ event: "digest_skipped_existing", period: weekly.periodKey }));
  } else {
    await publishWindow(env, weekly);
  }
}

export default {
  async scheduled(controller, env, ctx): Promise<void> {
    ctx.waitUntil(publishDigests(env, new Date(controller.scheduledTime)));
  },
  async fetch(): Promise<Response> {
    return Response.json({ service: "lkmlens-digest", status: "ok" });
  },
} satisfies ExportedHandler<Env>;
