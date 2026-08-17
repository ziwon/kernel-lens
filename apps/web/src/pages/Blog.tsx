import { Link } from "react-router";
import { EmptyState, ErrorState, SkeletonRows } from "../components/States.tsx";
import { SectionMarker } from "../components/SectionMarker.tsx";
import { StatusTag } from "../components/StatusTag.tsx";
import { fetchBlogPosts } from "../lib/api.ts";
import { formatDate, plural } from "../lib/format.ts";
import { frame } from "../lib/frame.ts";
import { useAsync } from "../lib/useAsync.ts";

export default function Blog() {
  const result = useAsync(fetchBlogPosts, []);
  return (
    <div className={`${frame} py-12 sm:py-16`}>
      <header className="flex flex-col items-start gap-5 border-b border-border-strong pb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
        <div>
          <SectionMarker index="01" label="Evidence-linked analysis" />
          <h1 className="mt-3 max-w-[18ch] text-h1 text-ink">What kernel changes mean in practice</h1>
          <p className="mt-4 max-w-[62ch] text-body-lg text-ink-secondary">
            Weekly engineering watchlists and event-driven Patch Briefings connect observed upstream changes to hardware integration, firmware, validation, and product work.
          </p>
        </div>
        <a href="/rss/blog.xml" className="focus-ring inline-flex min-h-11 shrink-0 items-center rounded-md border border-border-strong px-3.5 font-mono text-meta tracking-[0.06em] text-ink-secondary uppercase transition-colors hover:border-accent hover:text-accent">
          Analysis RSS
        </a>
      </header>
      <div className="mt-8">
        {result.status === "loading" && <SkeletonRows rows={4} label="Loading analysis…" />}
        {result.status === "error" && <ErrorState title="Could not load analysis." detail={result.error.message} />}
        {result.status === "success" && result.data.length === 0 && (
          <EmptyState title="No analysis has been published yet.">
            Drafts remain private until editorial review is complete.
          </EmptyState>
        )}
        {result.status === "success" && result.data.length > 0 && (
          <ul className="border-t border-border">
            {result.data.map((post) => (
              <li key={post.id} className="border-b border-border">
                <Link to={`/blog/${post.slug}`} className="focus-ring group grid gap-3 py-7 transition-colors hover:bg-surface-subtle sm:grid-cols-[9rem_1fr_auto] sm:items-start sm:gap-7">
                  <span className="font-mono text-meta tracking-[0.06em] text-ink-muted uppercase">
                    <StatusTag tone={post.postType === "briefing" ? "info" : "neutral"} mark={null}>
                      {post.postType === "briefing" ? "Patch briefing" : "Weekly"}
                    </StatusTag>
                    <span className="mt-2 block">
                      {post.postType === "weekly" ? post.periodKey : `Evidence through ${formatDate(post.evidenceCutoff)}`}
                    </span>
                    <span className="mt-0.5 block">{formatDate(post.publishedAt)}</span>
                  </span>
                  <span>
                    <span className="block text-h3 text-ink transition-colors group-hover:text-accent">{post.title}</span>
                    <span className="mt-2 block max-w-[68ch] text-body text-ink-secondary">{post.dek}</span>
                    <span className="tabular mt-3 block font-mono text-meta text-ink-muted">{plural(post.sourceThreadIds.length, "source thread")}</span>
                  </span>
                  <span className="font-mono text-meta tracking-[0.06em] text-ink-muted uppercase group-hover:text-accent">Read →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
