import { EDITORIAL_POSTS } from "@lkmlens/shared";
import { AnalysisPostRow } from "../components/AnalysisPostRow.tsx";
import { EditorialPostRow } from "../components/EditorialPostRow.tsx";
import { ErrorState, SkeletonRows } from "../components/States.tsx";
import { SectionMarker } from "../components/SectionMarker.tsx";
import { fetchBlogPosts } from "../lib/api.ts";
import { frame } from "../lib/frame.ts";
import { useAsync } from "../lib/useAsync.ts";

export default function Blog() {
  const result = useAsync(fetchBlogPosts, []);
  return (
    <div className={`${frame} py-12 sm:py-16`}>
      <header className="flex flex-col items-start gap-5 border-b border-border-strong pb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
        <div>
          <SectionMarker index="01" label="Architecture & analysis" />
          <h1 className="mt-3 max-w-[20ch] text-h1 text-ink">
            Architecture primers and kernel change analysis
          </h1>
          <p className="mt-4 max-w-[64ch] text-body-lg text-ink-secondary">
            Evergreen explainers map the hardware beneath Linux. Weekly watchlists and event-driven Patch Briefings connect upstream changes to hardware integration, firmware, validation, and product work.
          </p>
        </div>
        <a href="/rss/blog.xml" className="focus-ring inline-flex min-h-11 shrink-0 items-center rounded-md border border-border-strong px-3.5 font-mono text-meta tracking-[0.06em] text-ink-secondary uppercase transition-colors hover:border-accent hover:text-accent">
          Analysis RSS
        </a>
      </header>
      <div className="mt-8">
        <ul className="border-t border-border">
          {EDITORIAL_POSTS.map((post) => (
            <EditorialPostRow key={post.slug} post={post} />
          ))}
          {result.status === "success" && result.data.map((post) => (
            <AnalysisPostRow key={post.id} post={post} />
          ))}
        </ul>
        {result.status === "loading" && (
          <div className="mt-6">
            <SkeletonRows rows={3} label="Loading recent analysis…" />
          </div>
        )}
        {result.status === "error" && (
          <div className="mt-6">
            <ErrorState title="Could not load recent analysis." detail={result.error.message} />
          </div>
        )}
      </div>
    </div>
  );
}
