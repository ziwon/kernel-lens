import { getPublishedBlogPostBySlug } from "@lkmlens/db";

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const slug = String(params.slug ?? "");
  if (!/^[a-z0-9-]{1,160}$/.test(slug)) {
    return Response.json({ error: "Invalid blog slug" }, { status: 400 });
  }
  const post = await getPublishedBlogPostBySlug(env.DB, slug);
  if (!post) return Response.json({ error: "Blog post not found" }, { status: 404 });
  return Response.json(post, {
    headers: { "cache-control": "public, max-age=300" },
  });
};
