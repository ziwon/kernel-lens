import { Link, useSearchParams } from "react-router";
import { SearchBox } from "../components/SearchBox.tsx";
import { SectionMarker } from "../components/SectionMarker.tsx";
import { SourceLink } from "../components/SourceLink.tsx";
import { MetaTag } from "../components/StatusTag.tsx";
import { EmptyState, ErrorState, SkeletonRows } from "../components/States.tsx";
import { fetchSearch } from "../lib/api.ts";
import { useAsync } from "../lib/useAsync.ts";
import { formatDate, plural } from "../lib/format.ts";
import { frame } from "../lib/frame.ts";

const operators = [
  { syntax: "topic:<slug>", example: "topic:iommu" },
  { syntax: "list:<mailing-list>", example: "list:linux-mm" },
  { syntax: "author:<name>", example: "author:torvalds" },
  { syntax: "type:<thread-type>", example: "type:rfc" },
  { syntax: "version:<vN>", example: "version:v4" },
  { syntax: "after:<yyyy-mm-dd>", example: "after:2026-01-01" },
  { syntax: "before:<yyyy-mm-dd>", example: "before:2026-08-01" },
  { syntax: '"exact phrase"', example: '"memory folio"' },
];

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const results = useAsync(() => fetchSearch(q), [q]);

  return (
    <div className={`${frame} py-10 sm:py-14`}>
      <h1 className="sr-only">Search Kernel Lens</h1>
      <SectionMarker index="01" label="Search" />
      <div className="mt-3 max-w-3xl">
        <SearchBox autoFocus initialValue={q} />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
        {/* 3 columns: query help (DESIGN.md 10.2). */}
        <aside className="lg:order-last lg:col-span-3">
          <div className="border-t border-border-strong pt-4">
            <SectionMarker label="Query syntax" />
            <dl className="mt-3 space-y-2.5">
              {operators.map((operator) => (
                <div key={operator.syntax}>
                  <dt className="font-mono text-meta text-ink-secondary">{operator.syntax}</dt>
                  <dd className="mt-0.5">
                    <Link
                      to={`/search?q=${encodeURIComponent(operator.example)}`}
                      className="focus-ring font-mono text-meta text-accent hover:underline"
                    >
                      {operator.example}
                    </Link>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-small text-ink-muted">
              Filters combine with free text. Coverage depends on what has been indexed — see{" "}
              <Link to="/about/methodology" className="focus-ring text-accent hover:underline">
                methodology
              </Link>
              .
            </p>
          </div>
        </aside>

        {/* 9 columns: results. */}
        <div className="lg:col-span-9">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border-strong pb-3">
            <p className="min-w-0 font-mono text-meta tracking-[0.06em] text-ink-muted uppercase">
              {q ? <>Query — {q}</> : "No query"}
            </p>
            {q && results.status === "success" && (
              <p className="tabular shrink-0 font-mono text-meta text-ink-muted">
                {plural(results.data.length, "result")} · relevance order
              </p>
            )}
          </div>

          {!q && (
            <div className="pt-6">
              <EmptyState title="Enter a query to search indexed public discussions.">
                Search covers subjects and message bodies from the mailing lists Kernel Lens
                indexes. Start with a symbol, a file path, or one of the operators listed
                alongside.
              </EmptyState>
            </div>
          )}

          {q && results.status === "loading" && (
            <SkeletonRows rows={4} label="Loading indexed discussions…" />
          )}

          {q && results.status === "error" && (
            <div className="pt-6">
              <ErrorState title="Search failed." detail={results.error.message} />
            </div>
          )}

          {q && results.status === "success" && results.data.length === 0 && (
            <div className="pt-6">
              <EmptyState title={`No indexed message matches “${q}”.`}>
                <p>
                  A term can be absent because it was never posted, or because the message
                  lives on a list Kernel Lens has not indexed yet.
                </p>
                <p className="mt-2">
                  Try a broader term, drop a filter, or widen the date range — for example{" "}
                  <Link
                    to={`/search?q=${encodeURIComponent("topic:iommu")}`}
                    className="focus-ring font-mono text-accent hover:underline"
                  >
                    topic:iommu
                  </Link>{" "}
                  instead of a narrow symbol name.
                </p>
              </EmptyState>
            </div>
          )}

          {q && results.status === "success" && results.data.length > 0 && (
            <ul>
              {results.data.map((r) => (
                <li
                  key={r.messageId}
                  className="border-b border-border py-5 transition-colors hover:bg-surface-subtle"
                >
                  <h2 className="text-body-lg font-medium text-ink">
                    {r.threadId != null ? (
                      <Link
                        to={`/threads/${r.threadId}`}
                        className="focus-ring transition-colors hover:text-accent"
                      >
                        {r.subject}
                      </Link>
                    ) : (
                      r.subject
                    )}
                  </h2>
                  <p
                    className="snippet mt-1.5 max-w-[76ch] text-small text-ink-secondary"
                    // The API HTML-escapes the canonical body preview before
                    // returning it. No source-provided HTML reaches this sink.
                    dangerouslySetInnerHTML={{ __html: r.snippet }}
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-meta text-ink-muted">
                    {r.authorName && <span>{r.authorName}</span>}
                    {r.mailingList && <MetaTag>list:{r.mailingList}</MetaTag>}
                    {r.threadType && <MetaTag>{r.threadType}</MetaTag>}
                    {r.patchVersion != null && <MetaTag>v{r.patchVersion}</MetaTag>}
                    {r.postedAt && <span>{formatDate(r.postedAt)}</span>}
                    <SourceLink href={r.sourceUrl}>Open on lore</SourceLink>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
