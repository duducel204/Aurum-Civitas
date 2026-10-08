/** RM6 / AC9: explicit geographic profiles; no numeric production defaults. */
export const semanticId = "RM6";
export const archetypes = [
  "forest/wood",
  "mountain/stone+iron",
  "gold/minting",
  "junction/logistics",
  "fertile/agriculture",
  "coast/ports",
  "technology/architecture",
] as const;
export type Region = {
  id: string;
  archetype: (typeof archetypes)[number];
  neighbors: string[];
  yields: Record<string, number>;
  exports: string[];
  imports: string[];
  pixels: { x: number; y: number }[];
};
export function validateRegions(regions: Region[]): Region[] {
  const ids = new Set(regions.map((r) => r.id));
  if (ids.size !== regions.length) throw Error("RM6: duplicate region");
  for (const r of regions) {
    if (
      !r.id ||
      !archetypes.includes(r.archetype) ||
      !Object.keys(r.yields).length ||
      !Object.values(r.yields).every((n) => Number.isFinite(n) && n >= 0) ||
      r.neighbors.some((n) => !ids.has(n) || n === r.id) ||
      r.exports.some((e) => !(e in r.yields)) ||
      !r.pixels.length ||
      r.pixels.some(
        (p) => !Number.isSafeInteger(p.x) || !Number.isSafeInteger(p.y),
      )
    )
      throw Error("RM6: incomplete profile");
  }
  const pixels = regions.flatMap((r) => r.pixels.map((p) => `${p.x},${p.y}`));
  if (new Set(pixels).size !== pixels.length)
    throw Error("RM6: overlapping territory");
  return structuredClone(regions);
}
export function regionalProduction(
  region: Region,
  resource: string,
  base: number,
): number {
  if (!Number.isFinite(base) || base < 0 || !(resource in region.yields))
    throw Error("RM6: missing resource profile");
  return base * region.yields[resource];
}
