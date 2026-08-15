import type { SearchResultRow, ThreadDetail } from "@lkmlens/db";
import type {
  AiUsageStatus,
  BlogPost,
  BlogPostListItem,
  CurationChannel,
  CurationPatch,
  Digest,
  DigestPeriod,
  Topic,
} from "@lkmlens/shared";

export async function fetchTopics(): Promise<Topic[]> {
  const res = await fetch("/api/topics");
  if (!res.ok) throw new Error(`GET /api/topics failed: ${res.status}`);
  const data = (await res.json()) as { topics: Topic[] };
  return data.topics;
}

export async function fetchSearch(query: string, offset = 0): Promise<SearchResultRow[]> {
  const url = `/api/search?q=${encodeURIComponent(query)}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET /api/search failed: ${res.status}`);
  const data = (await res.json()) as { results: SearchResultRow[] };
  return data.results;
}

export async function fetchThread(id: string): Promise<ThreadDetail> {
  const res = await fetch(`/api/threads/${encodeURIComponent(id)}`);
  if (res.status === 404) throw new Error("not-found");
  if (!res.ok) throw new Error(`GET /api/threads/${id} failed: ${res.status}`);
  return (await res.json()) as ThreadDetail;
}

export async function fetchDigests(): Promise<Digest[]> {
  const res = await fetch("/api/digests");
  if (!res.ok) throw new Error(`GET /api/digests failed: ${res.status}`);
  const data = (await res.json()) as { digests: Digest[] };
  return data.digests;
}

export async function fetchDigest(period: DigestPeriod, key: string): Promise<Digest> {
  const res = await fetch(`/api/digests/${period}/${encodeURIComponent(key)}`);
  if (res.status === 404) throw new Error("not-found");
  if (!res.ok) throw new Error(`GET digest failed: ${res.status}`);
  return (await res.json()) as Digest;
}

export async function fetchBlogPosts(): Promise<BlogPostListItem[]> {
  const res = await fetch("/api/blog");
  if (!res.ok) throw new Error(`GET /api/blog failed: ${res.status}`);
  return ((await res.json()) as { posts: BlogPostListItem[] }).posts;
}

export async function fetchBlogPost(slug: string): Promise<BlogPost> {
  const res = await fetch(`/api/blog/${encodeURIComponent(slug)}`);
  if (res.status === 404) throw new Error("not-found");
  if (!res.ok) throw new Error(`GET blog post failed: ${res.status}`);
  return (await res.json()) as BlogPost;
}

export async function fetchAiUsageStatus(): Promise<AiUsageStatus> {
  const res = await fetch("/api/ai/status");
  if (!res.ok) throw new Error(`GET /api/ai/status failed: ${res.status}`);
  return (await res.json()) as AiUsageStatus;
}

export async function fetchCurationChannels(): Promise<CurationChannel[]> {
  const res = await fetch("/api/curation");
  if (!res.ok) throw new Error(`GET /api/curation failed: ${res.status}`);
  return ((await res.json()) as { channels: CurationChannel[] }).channels;
}

export async function fetchCurationFeed(
  kind: "topic" | "vendor",
  slug: string,
): Promise<{ channel: CurationChannel; patches: CurationPatch[] }> {
  const res = await fetch(`/api/curation/${kind}/${encodeURIComponent(slug)}`);
  if (res.status === 404) throw new Error("not-found");
  if (!res.ok) throw new Error(`GET curation feed failed: ${res.status}`);
  return (await res.json()) as { channel: CurationChannel; patches: CurationPatch[] };
}
