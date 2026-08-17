# Kernel Lens

> **A clearer view into Linux kernel development.**

Kernel Lens is an open-source Linux kernel intelligence service for hardware and
product teams. It follows selected public discussions from
[lore.kernel.org](https://lore.kernel.org/), reconstructs patch series, maps
changes to vendor and subsystem watchlists, and records observed progress from
submission through maintainer trees, mainline, releases, stable backports, and
Android common kernels.

**Live Production URL:** https://kernel-lens.pages.dev
**Legacy URL:** https://lkmlens.pages.dev *(permanently redirected via 301)*

Kernel Lens is not affiliated with kernel.org, the Linux Foundation, or the
Linux kernel project. lore.kernel.org remains the canonical source and
archive; Kernel Lens is a discovery and interpretation layer on top of it.

## System & Domain Migration

- **Public Brand Name:** Kernel Lens
- **Production URL:** `https://kernel-lens.pages.dev`
- **Legacy URL:** `https://lkmlens.pages.dev`
- **Internal Database & Bindings:** Retained as `lkmlens` for uninterrupted D1 data and worker collector state.

## Status

Version 0.3 development release. Topic and vendor curation, deterministic
product-impact mapping, patch revision intelligence, explicit review evidence,
integration-path records, search, evidence-linked AI summaries, and
daily/weekly digests are implemented. The analysis pipeline can turn either the
strongest weekly digest evidence or one review-rich patch series into a private
AI-assisted article draft for human publication.

## Repository layout

```text
apps/web/        Cloudflare Pages frontend (Vite + React + TypeScript + Tailwind)
functions/       Pages Functions API (/api/topics, /api/search) — must live at the
                  project root alongside wrangler.jsonc for Cloudflare Pages to find it
packages/        Shared libraries (db, lore-client, mail-parser, thread-builder,
                  classifier, search, ai, ui, shared)
workers/         Scheduled/queue Workers (collector, indexer, summarizer, digest, blog)
migrations/      D1 SQL migrations
scripts/         Operational scripts (seed-topics, rebuild-fts, backfill, ...)
```

## Development

Requires Node.js 20+, [pnpm](https://pnpm.io/), and the
[Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/).

```bash
pnpm install

# Web app
pnpm --filter @lkmlens/web dev

# Validate scheduled summary/digest/blog Workers
pnpm workers:typecheck

# D1 and curation indexes (local)
pnpm db:migrate:local
pnpm db:seed:topics:local
pnpm db:seed:impact:local
pnpm impact:compute:local
```

Scheduled Workers live in `workers/summarizer`, `workers/digest`, and
`workers/blog`. Apply all
D1 migrations before deploying them; the summarizer uses Gemini 3.1 Flash-Lite,
a configurable daily request budget, and processes at most five pending/stale
threads per hourly run. The blog Worker reads only a published weekly digest,
uses either Gemini (`google-gemini`) or Grok (`xai-grok`), and writes no more
than one private draft for each ISO week.

Single-topic Patch Briefings are generated explicitly from an indexed thread.
They retain message-level citations, an evidence cutoff, and the patch series
identifier without inventing a synthetic weekly digest:

```bash
pnpm blog:briefing:remote -- --thread 9133 --slug nvidia-rust-fwctl-nova-vgpu
pnpm blog:preview:remote -- --slug nvidia-rust-fwctl-nova-vgpu
```

Set `BLOG_AI_PROVIDER`, `BLOG_AI_MODEL`, and `BLOG_LANGUAGE` in
`workers/blog/wrangler.jsonc`, then install the matching paid API key as a
Worker secret:

```bash
pnpm --filter @lkmlens/blog exec wrangler secret put BLOG_AI_API_KEY --config wrangler.jsonc
```

Review and publish a generated draft explicitly:

```bash
pnpm blog:preview:remote -- --week 2026-W33
pnpm blog:publish:remote -- --week 2026-W33
```

Only published posts are exposed by `/api/blog`, `/blog`, and `/rss/blog.xml`.

The FTS index is contentless and rebuildable: it maps `message_search.rowid`
to `messages.id`, indexes the subject plus the first 1 KiB of each message
body, and keeps canonical message content only in `messages`. Incremental
collection inserts only missing FTS rows; use `scripts/rebuild-fts.ts` when a
full index rebuild is intentionally required.

## Deployment

Pull requests run the test, type-check, and web build checks. Pushes to `main`
run the same verification and then apply D1 migrations, synchronize the default
topic and impact rules, recompute vendor/product signals, deploy the scheduled
Workers, and deploy the Pages application through `.github/workflows/deploy.yml`.

The workflow requires these GitHub Actions repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `GEMINI_API_KEY`

`GEMINI_API_KEY` is uploaded as an encrypted secret of the
`lkmlens-summarizer` Worker. It must not be added to `wrangler.jsonc`, source
files, or frontend environment variables.

`BLOG_AI_API_KEY` is likewise uploaded only to `lkmlens-weekly-blog` with the
Wrangler command above. Its provider must match `BLOG_AI_PROVIDER`. Once
installed in Cloudflare, the secret remains attached to the Worker across
deployments and does not need to be duplicated in GitHub Actions.

## License

Apache License 2.0 — see [`LICENSE`](./LICENSE).

## Support

LKMLens is free and open source. See `/support` (once deployed) or
[GitHub Sponsors](https://github.com/sponsors/ziwon) to help cover indexing,
AI inference, and storage costs.
