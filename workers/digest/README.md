# digest

Publishes a completed UTC daily digest every day and ensures that the latest
completed ISO-week digest exists. The daily check recovers a missed Monday
run without rewriting an existing weekly digest. Digests are deterministic,
source-linked, and include current evidence-linked thread overviews when
available.

```bash
pnpm --filter @lkmlens/digest typecheck
pnpm --filter @lkmlens/digest deploy
```
