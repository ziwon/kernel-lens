# Blog generation

Creates at most one private, evidence-linked article draft for each published weekly digest. It runs daily, processes the oldest completed week after the most recent blog post, and therefore catches up in order after a transient digest or provider failure.

Configure `BLOG_AI_PROVIDER` as `google-gemini` or `xai-grok`, set the matching model in `BLOG_AI_MODEL`, then install the paid provider key without committing it:

```sh
pnpm --filter @lkmlens/blog exec wrangler secret put BLOG_AI_API_KEY --config wrangler.jsonc
```

The current production default is Grok 4.6 (`xai-grok` / `grok-4.6`). Gemini remains available by changing both vars. For local development, `pnpm --filter @lkmlens/blog dev` explicitly loads the repository-root `.env`; production still requires the encrypted `BLOG_AI_API_KEY` Worker secret. Generation only writes `draft`; use the root `blog:preview:*` and `blog:publish:*` commands for editorial review and publication.

Event-driven, single-topic Patch Briefings use the same provider, response
schema, and private-draft workflow, but take message-level evidence from one
indexed patch thread instead of a weekly digest. Generate one explicitly from
the repository root:

```sh
pnpm blog:briefing:remote -- --thread 9133 --slug nvidia-rust-fwctl-nova-vgpu
pnpm blog:preview:remote -- --slug nvidia-rust-fwctl-nova-vgpu
```

Generation never publishes the result. Use `--replace` only when intentionally
regenerating an existing briefing draft, then run the same preview step again.

For an intentional one-off replacement, override `BLOG_REGENERATE_PERIOD` with an exact `YYYY-Www` value in a remote development session and trigger its scheduled handler. The production value stays empty, so the deployed cron never overwrites an existing post automatically. A successful replacement becomes a private draft and must pass the same preview/publish step.
