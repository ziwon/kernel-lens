import { listPublishedBlogPosts } from "@lkmlens/db";
import { EDITORIAL_POSTS } from "@lkmlens/shared";

interface Env {
  DB: D1Database;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function rssDate(value: string | null): string {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.valueOf()) ? new Date().toUTCString() : date.toUTCString();
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const origin = new URL(request.url).origin;
  const selfUrl = `${origin}/rss/blog.xml`;
  const generatedPosts = await listPublishedBlogPosts(env.DB, 30);
  const posts = [...EDITORIAL_POSTS, ...generatedPosts]
    .sort((left, right) => (right.publishedAt ?? "").localeCompare(left.publishedAt ?? ""))
    .slice(0, 30);
  const items = posts.map((post) => {
    const url = `${origin}/blog/${post.slug}`;
    return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${escapeXml(rssDate(post.publishedAt))}</pubDate>
      <description>${escapeXml(post.dek)}</description>
    </item>`;
  }).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Kernel Lens Analysis</title>
    <link>${escapeXml(`${origin}/blog`)}</link>
    <description>Evergreen architecture primers and evidence-linked Linux kernel analysis.</description>
    <language>en</language>
    <lastBuildDate>${escapeXml(rssDate(posts[0]?.publishedAt ?? null))}</lastBuildDate>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`;
  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
};
