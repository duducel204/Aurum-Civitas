import test from "node:test";
import assert from "node:assert/strict";
import {
  validateRegions,
  archetypes,
  regionalProduction,
} from "../../lib/aurum/regions.ts";
import type { Region } from "../../lib/aurum/regions.ts";
test("RT6 RM6: all archetypes explicit, region topology and production advantages", () => {
  const regions: Region[] = archetypes.map((archetype, i) => ({
    id: "region" + i,
    archetype,
    neighbors: i ? ["region0"] : ["region1"],
    yields: { wood: i === 0 ? 2 : 1, food: i === 4 ? 2 : 1 },
    exports: ["wood"],
    imports: ["food"],
    pixels: [{ x: i, y: 0 }],
  }));
  const accepted = validateRegions(regions);
  assert(
    regionalProduction(accepted[0], "wood", 1) >
      regionalProduction(accepted[4], "wood", 1),
  );
  assert(
    regionalProduction(accepted[4], "food", 1) >
      regionalProduction(accepted[0], "food", 1),
  );
  assert.throws(() =>
    validateRegions([{ ...regions[0], neighbors: ["missing"] }]),
  );
  assert.throws(() =>
    validateRegions([regions[0], { ...regions[1], pixels: regions[0].pixels }]),
  );
  assert.throws(() => regionalProduction(regions[0], "gold", 1));
});
