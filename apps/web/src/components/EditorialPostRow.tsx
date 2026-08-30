import type { EditorialPostMetadata } from "@lkmlens/shared";
import { Link } from "react-router";
import { formatDate, plural } from "../lib/format.ts";
import { StatusTag } from "./StatusTag.tsx";

export function EditorialPostRow({ post }: { post: EditorialPostMetadata }) {
  return (
    <li className="border-b border-border">
      <Link
        to={`/blog/${post.slug}`}
        className="focus-ring group grid gap-3 py-7 transition-colors hover:bg-surface-subtle sm:grid-cols-[9rem_1fr_auto] sm:items-start sm:gap-7"
      >
        <span className="font-mono text-meta tracking-[0.06em] text-ink-muted uppercase">
          <StatusTag tone="evidence">Architecture primer</StatusTag>
          <span className="mt-2 block">Part {post.part} · Evergreen</span>
          <span className="mt-0.5 block">{formatDate(post.publishedAt)}</span>
        </span>
        <span>
          <span className="block text-h3 text-ink transition-colors group-hover:text-accent">
            {post.title}
          </span>
          <span className="mt-2 block max-w-[68ch] text-body text-ink-secondary">
            {post.dek}
          </span>
          <span className="tabular mt-3 block font-mono text-meta text-ink-muted">
            {plural(post.sourceCount, "primary source")} · {post.readingMinutes} min read
          </span>
        </span>
        <span className="font-mono text-meta tracking-[0.06em] text-ink-muted uppercase group-hover:text-accent">
          Read →
        </span>
      </Link>
    </li>
  );
}
