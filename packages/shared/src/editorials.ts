export interface EditorialPostMetadata {
  slug: string;
  title: string;
  dek: string;
  series: string;
  part: number;
  publishedAt: string;
  readingMinutes: number;
  sourceCount: number;
}

export const CPU_ARCHITECTURE_LINEAGE_PART_ONE = {
  slug: "from-cisc-to-risc-v-cpu-architecture-lineage",
  title: "From CISC to RISC-V: A Genealogy of Modern CPU Architectures",
  dek: "How x86, Arm, MIPS, SPARC, POWER, and RISC-V emerged—and why Linux still carries their architectural history in arch/.",
  series: "CPU Architecture Genealogy",
  part: 1,
  publishedAt: "2026-08-30T08:30:00.000Z",
  readingMinutes: 18,
  sourceCount: 14,
} satisfies EditorialPostMetadata;

export const EDITORIAL_POSTS = [
  CPU_ARCHITECTURE_LINEAGE_PART_ONE,
] as const satisfies readonly EditorialPostMetadata[];
