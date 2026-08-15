import { listPublishedBlogPosts } from "@lkmlens/db";

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const posts = await listPublishedBlogPosts(env.DB);
  return Response.json({ posts }, {
    headers: { "cache-control": "public, max-age=300" },
  });
};
