import { EDITORIAL_POSTS, getSiteUrl } from "@lkmlens/shared";

export const onRequestGet: PagesFunction<{ PUBLIC_SITE_URL?: string }> = async ({ env }) => {
  const baseUrl = getSiteUrl(env);
  const now = new Date().toISOString().split("T")[0];

  const staticPages = [
    "",
    "/topics",
    "/vendors",
    "/digests",
    "/blog",
    "/about",
    "/about/methodology",
    "/support",
    "/privacy",
    "/terms",
  ];

  const pages = [
    ...staticPages.map((path) => ({ path, lastmod: now, changefreq: "daily" })),
    ...EDITORIAL_POSTS.map((post) => ({
      path: `/blog/${post.slug}`,
      lastmod: post.publishedAt.slice(0, 10),
      changefreq: "monthly",
    })),
  ];

  const urls = pages
    .map(
      ({ path, lastmod, changefreq }) => `  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
  </url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
};
