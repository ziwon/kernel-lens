import type { D1Database } from "@cloudflare/workers-types";
import {
  deriveLifecycleStage,
  type CurationChannel,
  type CurationPatch,
  type PatchLifecycle,
} from "@lkmlens/shared";

interface ChannelRow {
  slug: string;
  name: string;
  description: string | null;
  patch_count: number;
}

interface VendorChannelRow {
  vendor: string;
  description: string | null;
  layers_json: string;
  patch_count: number;
}

interface PatchRow {
  thread_id: number;
  subject: string;
  author_name: string | null;
  source_url: string;
  first_posted_at: string | null;
  last_activity_at: string | null;
  patch_version: number | null;
  topics_json: string;
  vendors_json: string;
  affected_layers_json: string;
  likely_stakeholders_json: string;
  reviewed_count: number;
  acked_count: number;
  series_id: number | null;
  maintainer_tree: string | null;
  maintainer_tree_url: string | null;
  mainline_commit: string | null;
  mainline_commit_url: string | null;
  mainline_merged_at: string | null;
  linux_version: string | null;
  stable_versions_json: string | null;
  android_common_branches_json: string | null;
  source_urls_json: string | null;
  checked_at: string | null;
  lifecycle_updated_at: string | null;
}

export function slugifyVendor(vendor: string): string {
  return vendor.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function listCurationChannels(db: D1Database): Promise<CurationChannel[]> {
  const [topicResult, vendorResult] = await Promise.all([
    db.prepare(
      `SELECT tp.slug, tp.name, tp.description, COUNT(DISTINCT tt.thread_id) AS patch_count
       FROM topics tp LEFT JOIN thread_topics tt ON tt.topic_id = tp.id
       WHERE tp.enabled = 1
       GROUP BY tp.id ORDER BY tp.display_order ASC, tp.name ASC`,
    ).all<ChannelRow>(),
    db.prepare(
      `WITH vendor_counts AS (
         SELECT vendors.value AS vendor, COUNT(DISTINCT ti.thread_id) AS patch_count
         FROM thread_impact ti
         JOIN json_each(COALESCE(ti.vendors_json, '[]')) vendors
         GROUP BY vendors.value
       ), rules AS (
         SELECT DISTINCT vendor, layer FROM impact_rules
         WHERE enabled = 1 AND vendor IS NOT NULL
       )
       SELECT rules.vendor, vp.description, json_group_array(DISTINCT rules.layer) AS layers_json,
              COALESCE(vc.patch_count, 0) AS patch_count
       FROM rules
       LEFT JOIN vendor_profiles vp ON vp.vendor = rules.vendor
       LEFT JOIN vendor_counts vc ON vc.vendor = rules.vendor
       GROUP BY rules.vendor ORDER BY rules.vendor ASC`,
    ).all<VendorChannelRow>(),
  ]);

  const vendorChannels = vendorResult.results.map((row) => {
    return {
      kind: "vendor" as const,
      slug: slugifyVendor(row.vendor),
      name: row.vendor,
      // Curated copy from config/vendors/*.yaml. A vendor named only by a
      // rule (no watchlist file) has no description, and the UI omits the
      // line rather than repeating filler across every card.
      description: row.description,
      patchCount: row.patch_count,
      trackedAreas: JSON.parse(row.layers_json) as string[],
    };
  });

  return [
    ...topicResult.results.map((row) => ({
      kind: "topic" as const,
      slug: row.slug,
      name: row.name,
      description: row.description,
      patchCount: row.patch_count,
      trackedAreas: [],
    })),
    ...vendorChannels,
  ];
}

const patchSelect = `
  SELECT t.id AS thread_id, t.display_subject AS subject, t.author_name, t.source_url,
         t.first_posted_at, t.last_activity_at, t.patch_version,
         COALESCE((SELECT json_group_array(tp.name) FROM thread_topics tt2
                   JOIN topics tp ON tp.id = tt2.topic_id WHERE tt2.thread_id = t.id), '[]') AS topics_json,
         COALESCE(ti.vendors_json, '[]') AS vendors_json,
         COALESCE(ti.affected_layers_json, '[]') AS affected_layers_json,
         COALESCE(ti.likely_stakeholders_json, '[]') AS likely_stakeholders_json,
         (SELECT COUNT(*) FROM review_signals rs WHERE rs.thread_id = t.id AND rs.signal_type = 'Reviewed-by') AS reviewed_count,
         (SELECT COUNT(*) FROM review_signals rs WHERE rs.thread_id = t.id AND rs.signal_type = 'Acked-by') AS acked_count,
         pr.series_id, pl.maintainer_tree, pl.maintainer_tree_url, pl.mainline_commit,
         pl.mainline_commit_url, pl.mainline_merged_at, pl.linux_version,
         pl.stable_versions_json, pl.android_common_branches_json, pl.source_urls_json,
         pl.checked_at, pl.updated_at AS lifecycle_updated_at
  FROM threads t
  LEFT JOIN thread_impact ti ON ti.thread_id = t.id
  LEFT JOIN patch_revisions pr ON pr.thread_id = t.id
  LEFT JOIN patch_lifecycle pl ON pl.series_id = pr.series_id`;

function rowToPatch(row: PatchRow): CurationPatch {
  const lifecycle: PatchLifecycle | null = row.series_id === null || row.lifecycle_updated_at === null ? null : {
    seriesId: row.series_id,
    maintainerTree: row.maintainer_tree,
    maintainerTreeUrl: row.maintainer_tree_url,
    mainlineCommit: row.mainline_commit,
    mainlineCommitUrl: row.mainline_commit_url,
    mainlineMergedAt: row.mainline_merged_at,
    linuxVersion: row.linux_version,
    stableVersions: JSON.parse(row.stable_versions_json ?? "[]") as string[],
    androidCommonBranches: JSON.parse(row.android_common_branches_json ?? "[]") as string[],
    sourceUrls: JSON.parse(row.source_urls_json ?? "[]") as string[],
    checkedAt: row.checked_at,
    updatedAt: row.lifecycle_updated_at,
  };
  const reviewTypes = [
    ...Array.from({ length: row.reviewed_count }, () => ({ signalType: "Reviewed-by" as const })),
    ...Array.from({ length: row.acked_count }, () => ({ signalType: "Acked-by" as const })),
  ];
  return {
    threadId: row.thread_id,
    subject: row.subject,
    authorName: row.author_name,
    sourceUrl: row.source_url,
    firstPostedAt: row.first_posted_at,
    lastActivityAt: row.last_activity_at,
    patchVersion: row.patch_version,
    topics: JSON.parse(row.topics_json) as string[],
    vendors: JSON.parse(row.vendors_json) as string[],
    affectedLayers: JSON.parse(row.affected_layers_json) as string[],
    likelyStakeholders: JSON.parse(row.likely_stakeholders_json) as string[],
    reviewedCount: row.reviewed_count,
    ackedCount: row.acked_count,
    lifecycle,
    lifecycleStage: deriveLifecycleStage(lifecycle, reviewTypes),
  };
}

export async function listTopicPatches(db: D1Database, slug: string, limit = 30): Promise<CurationPatch[]> {
  const { results } = await db.prepare(
    `${patchSelect}
     JOIN thread_topics selected ON selected.thread_id = t.id
     JOIN topics selected_topic ON selected_topic.id = selected.topic_id
     WHERE selected_topic.slug = ?
     ORDER BY CASE
       WHEN json_array_length(COALESCE(pl.android_common_branches_json, '[]')) > 0 THEN 7
       WHEN json_array_length(COALESCE(pl.stable_versions_json, '[]')) > 0 THEN 6
       WHEN pl.linux_version IS NOT NULL THEN 5 WHEN pl.mainline_commit IS NOT NULL THEN 4
       WHEN pl.maintainer_tree IS NOT NULL THEN 3
       WHEN EXISTS (SELECT 1 FROM review_signals rs WHERE rs.thread_id = t.id AND rs.signal_type IN ('Reviewed-by','Acked-by')) THEN 2
       ELSE 1 END DESC,
       t.last_activity_at DESC LIMIT ?`,
  ).bind(slug, limit).all<PatchRow>();
  return results.map(rowToPatch);
}

export async function listVendorPatches(db: D1Database, slug: string, limit = 30): Promise<{ name: string; patches: CurationPatch[] } | null> {
  const channels = (await listCurationChannels(db)).filter((channel) => channel.kind === "vendor");
  const channel = channels.find((item) => item.slug === slug);
  if (!channel) return null;
  const { results } = await db.prepare(
    `${patchSelect}
     WHERE EXISTS (SELECT 1 FROM json_each(COALESCE(ti.vendors_json, '[]')) WHERE value = ?)
     ORDER BY CASE
       WHEN json_array_length(COALESCE(pl.android_common_branches_json, '[]')) > 0 THEN 7
       WHEN json_array_length(COALESCE(pl.stable_versions_json, '[]')) > 0 THEN 6
       WHEN pl.linux_version IS NOT NULL THEN 5 WHEN pl.mainline_commit IS NOT NULL THEN 4
       WHEN pl.maintainer_tree IS NOT NULL THEN 3
       WHEN EXISTS (SELECT 1 FROM review_signals rs WHERE rs.thread_id = t.id AND rs.signal_type IN ('Reviewed-by','Acked-by')) THEN 2
       ELSE 1 END DESC,
       t.last_activity_at DESC LIMIT ?`,
  ).bind(channel.name, limit).all<PatchRow>();
  return { name: channel.name, patches: results.map(rowToPatch) };
}
