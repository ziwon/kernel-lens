import type { BlogPostParagraph, BlogPostSource } from "@lkmlens/shared";
import { Link, useParams } from "react-router";
import { EvidenceCodeBlock } from "../components/EvidenceCodeBlock.tsx";
import { SectionMarker } from "../components/SectionMarker.tsx";
import { SourceLink } from "../components/SourceLink.tsx";
import { ErrorState, SkeletonRows } from "../components/States.tsx";
import { fetchBlogPost } from "../lib/api.ts";
import { formatDate } from "../lib/format.ts";
import { frameRead } from "../lib/frame.ts";
import { useAsync } from "../lib/useAsync.ts";

function EvidenceParagraph({ paragraph, sources }: { paragraph: BlogPostParagraph; sources: Map<string, BlogPostSource> }) {
  return (
    <p className="text-body-lg leading-8 text-ink-secondary">
      {paragraph.text}
      {paragraph.sourceIds.map((sourceId) => {
        const source = sources.get(sourceId);
        return source ? (
          <SourceLink key={sourceId} href={source.sourceUrl} className="ml-1 align-super font-mono text-meta no-underline" title={source.subject}>
            [{sourceId.slice(1)}]
          </SourceLink>
        ) : null;
      })}
    </p>
  );
}

export default function BlogPost() {
  const { slug = "" } = useParams();
  const result = useAsync(() => fetchBlogPost(slug), [slug]);
  if (result.status === "loading") return <div className={`${frameRead} py-12`}><SkeletonRows rows={5} label="Loading analysis…" /></div>;
  if (result.status === "error") return (
    <div className={`${frameRead} py-12`}>
      <ErrorState title="Analysis not found." />
      <Link to="/blog" className="focus-ring mt-6 inline-block text-small text-accent hover:underline">← All analysis</Link>
    </div>
  );
  const post = result.data;
  const sources = new Map(post.sources.map((source) => [source.sourceId, source]));
  const citedIds = new Set([
    ...post.content.lead.sourceIds,
    ...post.content.sections.flatMap((section) => section.paragraphs.flatMap((paragraph) => paragraph.sourceIds)),
    ...post.content.sections.flatMap((section) => section.codeBlocks?.flatMap((block) => block.sources.map((source) => source.sourceId)) ?? []),
    ...post.content.watchItems.flatMap((item) => item.sourceIds),
  ]);
  return (
    <article className={`${frameRead} py-12 sm:py-16`}>
      <Link to="/blog" className="focus-ring text-small text-ink-muted hover:text-accent">← All analysis</Link>
      <header className="mt-6 border-b border-border-strong pb-8">
        <SectionMarker label={post.postType === "briefing"
          ? `Patch briefing · Evidence through ${formatDate(post.evidenceCutoff)}`
          : `Weekly analysis · ${post.periodKey}`} />
        <h1 className="mt-3 text-h1 text-ink">{post.title}</h1>
        <p className="mt-4 text-body-lg text-ink-secondary">{post.dek}</p>
        <p className="tabular mt-5 font-mono text-meta tracking-[0.04em] text-ink-muted uppercase">
          Published {formatDate(post.publishedAt)}
          {post.postType === "briefing" && post.lastVerifiedAt
            ? ` · Evidence last verified ${formatDate(post.lastVerifiedAt)}`
            : ""}
        </p>
      </header>

      <aside className="my-8 border-l-2 border-accent bg-surface-subtle px-5 py-4">
        <p className="font-mono text-meta tracking-[0.08em] text-accent uppercase">AI-assisted · editor published</p>
        <p className="mt-1.5 text-small text-ink-secondary">
          {post.postType === "briefing"
            ? "Generated from the cited patch posting and review discussion, then held as a private draft until human publication. The evidence cutoff is fixed; later lifecycle changes require new verification."
            : "Generated from the cited weekly digest evidence, then held as a private draft until human publication. It reports observed status, not merge or release predictions."}
        </p>
      </aside>

      <div className="space-y-6"><EvidenceParagraph paragraph={post.content.lead} sources={sources} /></div>
      {post.content.sections.map((section) => (
        <section key={section.heading} className="mt-12">
          <h2 className="border-t border-border-strong pt-5 text-h2 text-ink">{section.heading}</h2>
          <div className="mt-5 space-y-6">
            {section.paragraphs.map((paragraph, index) => (
              <div key={index} className="space-y-6">
                <EvidenceParagraph paragraph={paragraph} sources={sources} />
                {section.codeBlocks
                  ?.filter((block) => block.afterParagraph === index + 1)
                  .map((block) => (
                    <EvidenceCodeBlock
                      key={`${block.language}-${block.afterParagraph}-${block.caption}`}
                      block={block}
                      sources={sources}
                    />
                  ))}
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="mt-12 border-y border-border py-6">
        <SectionMarker label="What to watch" />
        <ul className="mt-4 space-y-4">
          {post.content.watchItems.map((item, index) => (
            <li key={index} className="grid grid-cols-[1.5rem_1fr] gap-3">
              <span className="font-mono text-meta text-ink-faint">{String(index + 1).padStart(2, "0")}</span>
              <EvidenceParagraph paragraph={item} sources={sources} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <SectionMarker label="Evidence record" />
        <ol className="mt-4 space-y-3">
          {post.sources.filter((source) => citedIds.has(source.sourceId)).map((source) => (
            <li key={source.sourceId} className="grid grid-cols-[2rem_1fr] gap-3 border-t border-border pt-3 text-small">
              <span className="font-mono text-ink-faint">[{source.sourceId.slice(1)}]</span>
              <span>
                {source.threadId === null
                  ? <span className="text-ink">{source.subject}</span>
                  : <Link to={`/threads/${source.threadId}`} className="focus-ring text-ink hover:text-accent">{source.subject}</Link>}
                {(source.authorName || source.postedAt) && (
                  <span className="mt-0.5 block font-mono text-meta text-ink-muted">
                    {[source.authorName, source.postedAt ? formatDate(source.postedAt) : null].filter(Boolean).join(" · ")}
                  </span>
                )}
                <SourceLink href={source.sourceUrl}>
                  {source.threadId === null
                    ? "Primary source"
                    : source.messageId ? "Primary message" : "Primary thread"}
                </SourceLink>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
