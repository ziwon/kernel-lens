import type { D1Database } from "@cloudflare/workers-types";
import { describe, expect, it } from "vitest";
import { listCurationChannels } from "./curation.js";

describe("listCurationChannels", () => {
  it("aggregates the vendor JSON expansion once before joining configured vendor metadata", async () => {
    const queries: string[] = [];
    const db = {
      prepare(query: string) {
        queries.push(query);
        const isTopicQuery = query.includes("FROM topics");
        return {
          all: async () => ({
            results: isTopicQuery
              ? []
              : [{
                  vendor: "Acme",
                  description: "Acme devices",
                  layers_json: '["driver","firmware"]',
                  patch_count: 0,
                }],
          }),
        };
      },
    } as unknown as D1Database;

    await expect(listCurationChannels(db)).resolves.toEqual([
      {
        kind: "vendor",
        slug: "acme",
        name: "Acme",
        description: "Acme devices",
        patchCount: 0,
        trackedAreas: ["driver", "firmware"],
      },
    ]);

    const vendorQuery = queries.find((query) => query.includes("impact_rules"));
    expect(vendorQuery).toBeDefined();

    const normalized = vendorQuery!.replace(/\s+/g, " ").trim().toLowerCase();
    expect(normalized.match(/\bthread_impact\b/g)).toHaveLength(1);
    expect(normalized.match(/\bjson_each\b/g)).toHaveLength(1);
    expect(normalized).toMatch(/from thread_impact\s+\w+\s+join json_each\(/);
    expect(normalized.indexOf("from thread_impact")).toBeLessThan(
      normalized.indexOf("from impact_rules"),
    );
    expect(normalized).not.toMatch(/exists\s*\([^)]*json_each/);
    expect(normalized).toMatch(/left join vendor_counts\b/);
    expect(normalized).toMatch(/coalesce\(\w+\.patch_count,\s*0\)\s+as patch_count/);
    expect(normalized).toMatch(/select distinct vendor,\s*layer from impact_rules/);
  });
});
