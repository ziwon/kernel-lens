import { generateWeeklyBlogPost, type BlogProvider } from "@lkmlens/ai";
import {
  getDigest,
  getBlogPostByPeriodKey,
  getNextWeeklyDigestForBlog,
  listBlogCandidateDetails,
  recordAiFailure,
  recordAiSuccess,
  reserveAiRequest,
  saveBlogDraft,
} from "@lkmlens/db";
import type { BlogPostLanguage } from "@lkmlens/shared";
import { rankBlogCandidates } from "./candidates.js";
import { BlogApiError } from "./providers/error.js";
import { createGeminiBlogProvider } from "./providers/gemini.js";
import { createGrokBlogProvider } from "./providers/grok.js";

type ProviderName = "google-gemini" | "xai-grok";

function positiveInteger(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function providerFor(env: Env): { name: ProviderName; provider: BlogProvider } {
  const providerName: string = env.BLOG_AI_PROVIDER;
  if (providerName === "google-gemini") {
    return { name: "google-gemini", provider: createGeminiBlogProvider(env.BLOG_AI_API_KEY, env.BLOG_AI_MODEL) };
  }
  if (providerName === "xai-grok") {
    return { name: "xai-grok", provider: createGrokBlogProvider(env.BLOG_AI_API_KEY, env.BLOG_AI_MODEL) };
  }
  throw new Error(`Unsupported BLOG_AI_PROVIDER: ${providerName}`);
}

function languageFor(value: string): BlogPostLanguage {
  if (value === "en" || value === "ko") return value;
  throw new Error(`Unsupported BLOG_LANGUAGE: ${value}`);
}

function slugFor(periodKey: string): string {
  return `kernel-lens-weekly-${periodKey.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export async function generateLatestBlogDraft(env: Env): Promise<{ status: string; periodKey?: string }> {
  const regenerationPeriod = env.BLOG_REGENERATE_PERIOD.trim();
  const replaceExisting = regenerationPeriod.length > 0;
  const digest = replaceExisting
    ? await getDigest(env.DB, "weekly", regenerationPeriod)
    : await getNextWeeklyDigestForBlog(env.DB);
  if (!digest) return { status: "no-weekly-digest" };

  const existing = await getBlogPostByPeriodKey(env.DB, digest.periodKey);
  if (existing && !replaceExisting) return { status: `already-${existing.status}`, periodKey: digest.periodKey };

  const details = await listBlogCandidateDetails(env.DB, digest.sourceThreadIds);
  const candidates = rankBlogCandidates(digest, details)
    .filter((candidate) => candidate.overview && candidate.evidenceUrls.length > 0);
  if (candidates.length < 2) {
    console.log(JSON.stringify({ event: "blog_skipped_insufficient_evidence", periodKey: digest.periodKey }));
    return { status: "insufficient-evidence", periodKey: digest.periodKey };
  }

  const { name, provider } = providerFor(env);
  // Keep the blog's one-attempt-per-day budget separate from the hourly
  // summarizer even when both workloads use the same provider and model.
  const usageProvider = `weekly-blog/${name}`;
  const language = languageFor(env.BLOG_LANGUAGE);
  const dailyLimit = positiveInteger(env.BLOG_AI_DAILY_REQUEST_LIMIT, 1);
  const reserved = await reserveAiRequest(env.DB, usageProvider, provider.model, dailyLimit);
  if (!reserved) return { status: "daily-budget-reached", periodKey: digest.periodKey };

  let aiCompleted = false;
  try {
    const generated = await generateWeeklyBlogPost(provider, digest.periodKey, candidates, language);
    await recordAiSuccess(env.DB, usageProvider, provider.model, generated.inputTokens, generated.outputTokens);
    aiCompleted = true;
    const usedSourceIds = new Set([
      ...generated.content.lead.sourceIds,
      ...generated.content.sections.flatMap((section) => section.paragraphs.flatMap((paragraph) => paragraph.sourceIds)),
      ...generated.content.watchItems.flatMap((item) => item.sourceIds),
    ]);
    const saved = await saveBlogDraft(env.DB, {
      postType: "weekly",
      periodKey: digest.periodKey,
      slug: slugFor(digest.periodKey),
      language,
      title: generated.title,
      content: generated.content,
      sources: candidates.filter((candidate) => usedSourceIds.has(candidate.sourceId)).map((candidate) => ({
        sourceId: candidate.sourceId,
        threadId: candidate.threadId,
        subject: candidate.subject,
        sourceUrl: candidate.sourceUrl,
        evidenceUrls: candidate.evidenceUrls,
      })),
      sourceDigestId: digest.id,
      provider: name,
      model: generated.model,
      promptVersion: generated.promptVersion,
      inputTokens: generated.inputTokens,
      outputTokens: generated.outputTokens,
      replaceExisting,
    });
    console.log(JSON.stringify({
      event: saved ? (replaceExisting ? "blog_draft_regenerated" : "blog_draft_generated") : "blog_draft_raced",
      periodKey: digest.periodKey,
      provider: name,
      model: provider.model,
      inputTokens: generated.inputTokens,
      outputTokens: generated.outputTokens,
    }));
    return {
      status: saved ? (replaceExisting ? "draft-regenerated" : "draft-generated") : "already-created",
      periodKey: digest.periodKey,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const quotaExhausted = error instanceof BlogApiError && error.quotaExhausted;
    if (!aiCompleted) await recordAiFailure(env.DB, usageProvider, provider.model, message, quotaExhausted);
    console.error(JSON.stringify({ event: "blog_generation_failed", periodKey: digest.periodKey, quotaExhausted, error: message }));
    throw error;
  }
}

export default {
  async scheduled(_controller, env, _ctx): Promise<void> {
    // A Grok reasoning request can exceed the 30-second post-response
    // waitUntil window. Keep the scheduled event open until the draft has
    // either been persisted or its failure has been accounted for.
    await generateLatestBlogDraft(env);
  },
  async fetch(): Promise<Response> {
    return Response.json({ service: "lkmlens-weekly-blog", status: "ok" });
  },
} satisfies ExportedHandler<Env>;
