/**
 * Shared domain types mirroring the D1 schema in migrations/0001_initial.sql.
 * See docs/PLANNING.md section 8 (Data Model) for the authoritative definitions.
 */

export interface Topic {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  enabled: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type TopicRuleType =
  | "alias"
  | "subject"
  | "mailing_list"
  | "file_path"
  | "patch_prefix"
  | "body";

export interface TopicRule {
  id: number;
  topicId: number;
  ruleType: TopicRuleType;
  pattern: string;
  weight: number;
  isNegative: boolean;
  enabled: boolean;
}

export type ThreadType =
  | "patch"
  | "rfc"
  | "pull_request"
  | "discussion"
  | "question"
  | "announcement"
  | "unknown";

export type SummaryState = "pending" | "generated" | "stale" | "skipped";

export interface Thread {
  id: number;
  rootMessageId: string;
  canonicalSubject: string;
  displaySubject: string;
  mailingList: string | null;
  threadType: ThreadType | null;
  patchVersion: number | null;
  patchTotal: number | null;
  authorName: string | null;
  sourceUrl: string;
  firstPostedAt: string | null;
  lastActivityAt: string | null;
  messageCount: number;
  reviewState: string | null;
  summaryState: SummaryState;
  rootConfidence: "complete" | "partial";
  createdAt: string;
  updatedAt: string;
}

export type MessageType = "patch" | "reply" | "cover_letter" | "unknown";

export interface Message {
  id: number;
  messageId: string;
  threadId: number | null;
  parentMessageId: string | null;
  subject: string;
  canonicalSubject: string | null;
  authorName: string | null;
  authorEmailHash: string | null;
  mailingList: string | null;
  messageType: MessageType | null;
  postedAt: string | null;
  sourceUrl: string;
  bodyText: string | null;
  bodyChecksum: string | null;
  rawObjectKey: string | null;
  patchIndex: number | null;
  patchTotal: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TopicMatch {
  topic: string;
  score: number;
  matchedBy: string[];
}

export interface ThreadTopic {
  threadId: number;
  topicId: number;
  score: number;
  matchedBy: string[];
  isManual: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Deterministic patch-impact tags for a thread (packages/impact) --
 * affected layer / likely stakeholders / a generic action hint, all rule-
 * matched and explainable. No AI-generated prose; that's a later
 * milestone (see docs/PLANNING.md section 7.8).
 */
export interface ThreadImpact {
  threadId: number;
  vendors: string[];
  affectedLayers: string[];
  likelyStakeholders: string[];
  suggestedAction: string | null;
  matchedBy: string[];
  generatedAt: string;
}

export type PatchLifecycleStage =
  | "submitted"
  | "under-review"
  | "maintainer-tree"
  | "mainline"
  | "released"
  | "stable-backport"
  | "android-common";

/** Observed repository and release evidence for a patch series. */
export interface PatchLifecycle {
  seriesId: number;
  maintainerTree: string | null;
  maintainerTreeUrl: string | null;
  mainlineCommit: string | null;
  mainlineCommitUrl: string | null;
  mainlineMergedAt: string | null;
  linuxVersion: string | null;
  stableVersions: string[];
  androidCommonBranches: string[];
  sourceUrls: string[];
  checkedAt: string | null;
  updatedAt: string;
}

export interface PatchSeries {
  id: number;
  seriesKey: string;
  canonicalSubject: string;
  latestVersion: number | null;
  latestThreadId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatchRevision {
  seriesId: number;
  version: number;
  threadId: number;
  changeNotes: string | null;
}

export type ReviewSignalType =
  | "Reviewed-by"
  | "Acked-by"
  | "Tested-by"
  | "Reported-by"
  | "Suggested-by"
  | "Co-developed-by"
  | "Signed-off-by";

export interface ReviewSignal {
  id: number;
  threadId: number;
  messageId: string;
  signalType: ReviewSignalType;
  personName: string;
  sourceUrl: string;
}

export interface PatchRevisionSummary {
  seriesId: number;
  version: number;
  threadId: number;
  displaySubject: string;
  firstPostedAt: string | null;
  changeNotes: string | null;
  isCurrent: boolean;
}

export interface SummaryEvidence {
  claimId: string;
  messageId: string;
  sourceUrl: string;
}

export interface SummaryExplicitSignal {
  type: string;
  person: string;
  messageId: string;
  sourceUrl: string;
}

/** Stable structure for AI-generated thread summaries. See PLANNING.md section 11. */
export interface SummaryContent {
  overview: string;
  whyItMatters: string;
  majorChanges: string[];
  reviewDiscussion: string[];
  outstandingQuestions: string[];
  explicitSignals: SummaryExplicitSignal[];
  uncertainties: string[];
  evidence: SummaryEvidence[];
}

export interface Summary {
  id: number;
  threadId: number;
  summaryType: string;
  content: SummaryContent;
  model: string;
  promptVersion: string;
  sourceMessageIds: string[];
  generatedAt: string;
  isCurrent: boolean;
  humanReviewState: "unreviewed" | "confirmed" | "flagged";
  sourceSetChecksum: string | null;
}

export type AiQuotaState = "normal" | "warning" | "exhausted";

export interface AiUsageStatus {
  usageDate: string;
  provider: string;
  model: string;
  dailyRequestLimit: number;
  requestCount: number;
  successCount: number;
  failureCount: number;
  inputTokens: number;
  outputTokens: number;
  remainingRequests: number;
  usagePercent: number;
  state: AiQuotaState;
  resetAt: string;
}

export type DigestPeriod = "daily" | "weekly";

export interface DigestThreadItem {
  threadId: number;
  subject: string;
  sourceUrl: string;
  topicNames: string[];
  messageCount: number;
  lastActivityAt: string | null;
  overview: string | null;
  overviewEvidence: Array<{ messageId: string; sourceUrl: string }>;
}

export interface DigestContent {
  mostActiveTopics: Array<{ slug: string; name: string; threadCount: number }>;
  threads: DigestThreadItem[];
}

export interface Digest {
  id: number;
  periodType: DigestPeriod;
  periodKey: string;
  title: string;
  content: DigestContent;
  sourceThreadIds: number[];
  generatedAt: string;
  publishedAt: string | null;
}

export type BlogPostStatus = "draft" | "published" | "archived";
export type BlogPostLanguage = "en" | "ko";

/** One evidence-linked unit of prose in a generated weekly article. */
export interface BlogPostParagraph {
  text: string;
  sourceIds: string[];
}

export interface BlogPostSection {
  heading: string;
  paragraphs: BlogPostParagraph[];
}

export interface BlogPostContent {
  dek: string;
  lead: BlogPostParagraph;
  sections: BlogPostSection[];
  watchItems: BlogPostParagraph[];
}

/** Canonical sources are supplied by the application, never invented by AI. */
export interface BlogPostSource {
  sourceId: string;
  threadId: number;
  subject: string;
  sourceUrl: string;
  evidenceUrls: string[];
}

export interface BlogPostListItem {
  id: number;
  periodKey: string;
  slug: string;
  language: BlogPostLanguage;
  title: string;
  dek: string;
  sourceThreadIds: number[];
  publishedAt: string | null;
}

export interface BlogPost extends BlogPostListItem {
  content: BlogPostContent;
  sources: BlogPostSource[];
  sourceDigestId: number;
  provider: string;
  model: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
  status: BlogPostStatus;
  generatedAt: string;
  updatedAt: string;
}
