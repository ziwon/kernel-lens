#!/usr/bin/env tsx
/**
 * Computes deterministic patch-impact tags (affected layer, likely
 * stakeholders, suggested action) for every thread, using impact_rules
 * against the root message's extracted file paths + subject. See
 * packages/impact for the matching logic. Idempotent upsert into
 * thread_impact — safe to re-run after seeding new rules or ingesting
 * more threads.
 *
 * Usage:
 *   tsx scripts/compute-impact.ts --local
 *   tsx scripts/compute-impact.ts --remote
 */

import { inferImpact, type ImpactRule } from "@lkmlens/impact";
import { extractFilePaths } from "@lkmlens/thread-builder";
import { execD1File, parseD1Target, queryD1, sqlString, type D1Target } from "./lib/d1.js";
import { fetchThreadRoots } from "./lib/thread-roots.js";

function fetchRules(target: D1Target): ImpactRule[] {
  const rows = queryD1<{
    rule_type: ImpactRule["ruleType"];
    pattern: string;
    layer: string;
    vendor: string | null;
    stakeholders_json: string;
  }>(
    "SELECT rule_type, pattern, layer, vendor, stakeholders_json FROM impact_rules WHERE enabled = 1",
    target,
  );

  return rows.map((r) => ({
    ruleType: r.rule_type,
    pattern: r.pattern,
    layer: r.layer,
    vendor: r.vendor,
    stakeholders: JSON.parse(r.stakeholders_json) as string[],
    enabled: true,
  }));
}

function main() {
  const target = parseD1Target(process.argv);
  const rules = fetchRules(target);
  const roots = fetchThreadRoots(target);

  console.log(`Computing impact for ${roots.length} thread(s) against ${rules.length} rule(s)...`);

  const statements: string[] = [];
  let matchedCount = 0;

  for (const root of roots) {
    const filePaths = extractFilePaths(root.body_text);
    const impact = inferImpact({ subject: root.subject, filePaths }, rules);
    if (impact.matchedBy.length > 0) matchedCount++;

    statements.push(`
INSERT INTO thread_impact (thread_id, vendors_json, affected_layers_json, likely_stakeholders_json, suggested_action, matched_by_json, generated_at)
VALUES (
  ${root.thread_id},
  ${sqlString(JSON.stringify(impact.vendors))},
  ${sqlString(JSON.stringify(impact.affectedLayers))},
  ${sqlString(JSON.stringify(impact.likelyStakeholders))},
  ${sqlString(impact.suggestedAction)},
  ${sqlString(JSON.stringify(impact.matchedBy))},
  CURRENT_TIMESTAMP
)
ON CONFLICT(thread_id) DO UPDATE SET
  vendors_json = excluded.vendors_json,
  affected_layers_json = excluded.affected_layers_json,
  likely_stakeholders_json = excluded.likely_stakeholders_json,
  suggested_action = excluded.suggested_action,
  matched_by_json = excluded.matched_by_json,
  generated_at = excluded.generated_at;`);
  }

  if (statements.length === 0) {
    console.log("No threads to process.");
    return;
  }

  execD1File(statements.join("\n"), target, `Computing impact for ${roots.length} thread(s)`);
  console.log(`Done. ${matchedCount}/${roots.length} thread(s) matched at least one impact rule.`);
}

main();
