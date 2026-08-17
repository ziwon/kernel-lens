import { Link } from "react-router";
import { AnalysisPostRow } from "../components/AnalysisPostRow.tsx";
import { SearchBox } from "../components/SearchBox.tsx";
import { SectionMarker } from "../components/SectionMarker.tsx";
import { SectionHeading } from "../components/SectionHeading.tsx";
import { ChannelGrid } from "../components/ChannelGrid.tsx";
import { EmptyState, ErrorState, LoadingNote } from "../components/States.tsx";
import { fetchBlogPosts, fetchCurationChannels, fetchDigests } from "../lib/api.ts";
import { useAsync } from "../lib/useAsync.ts";
import { formatDate, plural } from "../lib/format.ts";
import { frame } from "../lib/frame.ts";

export default function Home() {
  const channels = useAsync(fetchCurationChannels, []);
  const digests = useAsync(fetchDigests, []);
  const analysis = useAsync(fetchBlogPosts, []);

  const allTopics = channels.status === "success"
    ? channels.data.filter((channel) => channel.kind === "topic")
    : [];
  const allVendors = channels.status === "success"
    ? channels.data.filter((channel) => channel.kind === "vendor")
    : [];
  const visibleTopics = allTopics.filter((channel) => channel.patchCount > 0).slice(0, 8);
  const visibleVendors = allVendors.slice(0, 8);
  const observedPatches = allTopics.reduce((total, channel) => total + channel.patchCount, 0);
  const publishedReports = analysis.status === "success" && digests.status === "success"
    ? analysis.data.length + digests.data.length
    : "—";

  // Section markers must stay contiguous: the digests section is omitted until
  // an edition exists, while Analysis always renders its loading or empty state.
  const hasDigests = digests.status === "success" && digests.data.length > 0;
  const sectionIndex = (position: number) => String(position).padStart(2, "0");

  return (
    <>
      {/* 01 — editorial statement and the primary search console. */}
      <section className={`${frame} pt-14 pb-12 sm:pt-20 sm:pb-16`}>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <SectionMarker index="01" label="Kernel Lens" />
            <h1 className="mt-4 max-w-[18ch] text-display text-ink">
              A clearer view into Linux kernel development.
            </h1>
          </div>
          <div className="lg:col-span-7 lg:pt-14">
            <p className="max-w-[54ch] text-body-lg text-ink-secondary">
              See how public kernel changes move from proposal to integration — and what
              they mean for hardware and products. Every claim links back to its source
              message on lore.kernel.org.
            </p>
            <div className="mt-7">
              <SearchBox />
            </div>
            <p className="mt-3 font-mono text-meta text-ink-muted">
              Try{" "}
              <Link to="/search?q=dma-buf" className="focus-ring text-accent hover:underline">
                dma-buf
              </Link>
              {" · "}
              <Link
                to={`/search?q=${encodeURIComponent("topic:iommu")}`}
                className="focus-ring text-accent hover:underline"
              >
                topic:iommu
              </Link>
              {" · "}
              <Link
                to={`/search?q=${encodeURIComponent("Reviewed-by")}`}
                className="focus-ring text-accent hover:underline"
              >
                Reviewed-by
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Coverage strip: observed index scope, stated as counts, not claims. */}
      {channels.status === "success" && (
        <section className={frame} aria-label="Index coverage">
          <dl className="grid border-t border-l border-border sm:grid-cols-2 lg:grid-cols-4">
            <CoverageCell label="Topics tracked" value={allTopics.length} />
            <CoverageCell label="Vendor lenses" value={allVendors.length} />
            <CoverageCell label="Observed patches" value={observedPatches} />
            <CoverageCell label="Published reports" value={publishedReports} />
          </dl>
        </section>
      )}

      {/* 02 — latest evidence-linked analysis. */}
      <section className={`${frame} pt-16`} aria-labelledby="analysis-heading">
        <SectionHeading
          id="analysis-heading"
          index="02"
          marker="Analysis"
          title="Latest engineering analysis"
          description="Weekly synthesis and single-topic Patch Briefings connect observed kernel changes to infrastructure, validation, and product work."
          action={{ to: "/blog", label: "View all" }}
        />
        <div className="mt-2">
          {analysis.status === "loading" && <LoadingNote>Loading published analysis…</LoadingNote>}
          {analysis.status === "error" && (
            <ErrorState title="Could not load analysis." detail={analysis.error.message} />
          )}
          {analysis.status === "success" && analysis.data.length === 0 && (
            <EmptyState title="No analysis has been published yet.">
              Editor-reviewed articles appear here after publication.
            </EmptyState>
          )}
          {analysis.status === "success" && analysis.data.length > 0 && (
            <ul className="border-t border-border">
              {analysis.data.slice(0, 2).map((post) => (
                <AnalysisPostRow key={post.id} post={post} />
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 03 — topics. */}
      <section className={`${frame} pt-16`} aria-labelledby="topics-heading">
        <SectionHeading
          id="topics-heading"
          index="03"
          marker="Topics"
          title="Kernel areas under observation"
          description="Start with a subsystem or cross-cutting area, then follow its product impact."
          action={{ to: "/topics", label: "View all" }}
        />
        <div className="mt-6">
          {channels.status === "loading" && <LoadingNote>Loading indexed topics…</LoadingNote>}
          {channels.status === "error" && (
            <ErrorState title="Could not load topics." detail={channels.error.message} />
          )}
          {channels.status === "success" && visibleTopics.length === 0 && (
            <EmptyState title="No topic has observed patches yet.">
              Topic channels are configured, but impact indexing has not matched any public
              patch to them so far.
            </EmptyState>
          )}
          {visibleTopics.length > 0 && <ChannelGrid channels={visibleTopics} />}
        </div>
      </section>

      {/* 04 — vendors. */}
      <section className={`${frame} pt-16`} aria-labelledby="vendors-heading">
        <SectionHeading
          id="vendors-heading"
          index="04"
          marker="Vendors"
          title="Public changes mapped to hardware"
          description="Explainable watchlist rules connect changed paths and subsystems to platforms."
          action={{ to: "/vendors", label: "View all" }}
        />
        <div className="mt-6">
          {channels.status === "loading" && <LoadingNote>Loading vendor lenses…</LoadingNote>}
          {channels.status === "error" && (
            <ErrorState title="Could not load vendors." detail={channels.error.message} />
          )}
          {channels.status === "success" && visibleVendors.length === 0 && (
            <EmptyState title="No vendor channels are configured yet." />
          )}
          {visibleVendors.length > 0 && <ChannelGrid channels={visibleVendors} />}
        </div>
      </section>

      {/* 05 — recent digests, when an edition exists. */}
      {hasDigests && digests.status === "success" && (
        <section className={`${frame} pt-16`} aria-labelledby="digests-heading">
          <SectionHeading
            id="digests-heading"
            index={sectionIndex(5)}
            marker="Digests"
            title="Recent editions"
            description="Daily and weekly reports of selected threads, each linked to public evidence."
            action={{ to: "/digests", label: "View all" }}
          />
          <ul className="mt-2">
            {digests.data.slice(0, 3).map((digest) => (
              <li key={`${digest.periodType}:${digest.periodKey}`}>
                <Link
                  to={`/digests/${digest.periodType}/${digest.periodKey}`}
                  className="focus-ring group flex flex-col gap-1 border-b border-border py-5 transition-colors hover:bg-surface-subtle sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-ink transition-colors group-hover:text-accent">
                      {digest.title}
                    </span>
                    <span className="mt-1 block font-mono text-meta text-ink-muted">
                      {digest.periodType} · published {formatDate(digest.publishedAt)}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-meta text-ink-muted">
                    {plural(digest.content.threads.length, "patch", "patches")}{" "}
                    <span aria-hidden="true" className="group-hover:text-accent">
                      →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 06 — how to read what is shown here. */}
      <section className={`${frame} pt-16`} aria-labelledby="methodology-heading">
        <SectionHeading
          id="methodology-heading"
          index={sectionIndex(hasDigests ? 6 : 5)}
          marker="Methodology"
          title="How to read the evidence"
          description="Kernel Lens reports what is publicly observable and says so when it is not."
          action={{ to: "/about/methodology", label: "Read methodology" }}
        />
        <dl className="grid border-t border-l border-border md:grid-cols-3">
          {[
            {
              term: "Observed",
              detail:
                "A public source was found: a review trailer, a maintainer tree, a mainline commit, or a release.",
            },
            {
              term: "Not observed",
              detail:
                "No public evidence was found. It does not mean rejection, nor absence from a private vendor tree.",
            },
            {
              term: "Interpretation",
              detail:
                "AI summaries are labelled and cite the messages they draw from. They never predict a merge.",
            },
          ].map((item) => (
            <div key={item.term} className="border-r border-b border-border p-5">
              <dt className="font-mono text-meta tracking-[0.06em] text-ink-secondary uppercase">
                {item.term}
              </dt>
              <dd className="mt-2 text-small text-ink-muted">{item.detail}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}

function CoverageCell({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-r border-b border-border px-5 py-4">
      <dt className="font-mono text-meta tracking-[0.06em] text-ink-muted uppercase">{label}</dt>
      <dd className="mt-1.5 font-mono text-h3 tabular text-ink">{value}</dd>
    </div>
  );
}
