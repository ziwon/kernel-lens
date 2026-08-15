import { getSiteUrl } from "@lkmlens/shared";

export const onRequestGet: PagesFunction<{ PUBLIC_SITE_URL?: string }> = async ({ env, request }) => {
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

  const urls = staticPages
    .map(
      (path) => `  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
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
