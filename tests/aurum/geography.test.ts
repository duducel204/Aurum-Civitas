import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createState, step } from "../../lib/aurum/simulation.ts";
import { cellCenter } from "../../lib/aurum/geography.ts";
import type { Rules, Store, Carrier } from "../../lib/aurum/rules.ts";
export function itaipu() {
  return JSON.parse(readFileSync(new URL("../../fixtures/itaipu-scenario.json", import.meta.url), "utf8")) as {
    rules: Rules; stores: Store[]; carriers: Carrier[]; suggestions: { x: number; y: number }[];
  };
}
test("RTE RME: supplied map hashes, 4,977 free existing roads and protected placement", () => {
  const f = itaipu(), initial = createState(f.rules, f.stores, f.carriers);
  for (const [path, expected] of [
    ["../../fixtures/itaipu-start-map.json", f.rules.geography!.mapHash],
    ["../../fixtures/maps/itaipu-osm-source.json.gz", f.rules.geography!.sourceHash],
  ]) assert.equal(createHash("sha256").update(readFileSync(new URL(path, import.meta.url))).digest("hex"), expected);
  assert.equal(Object.keys(initial.roads).length, 4977);
  const fixed = step(initial, [{ id: "road-buy", kind: "road", x: 100, y: 100 }], f.rules);
  assert.deepEqual(fixed.roads, initial.roads);
  assert.equal(fixed.events.at(-1)?.reason, "mapped-roads-fixed");
  for (const code of ["w", "g", "b", "f", "r"]) {
    const y = f.rules.geography!.grid.findIndex((r) => r.includes(code));
    const x = f.rules.geography!.grid[y].indexOf(code);
    const rejected = step(initial, [{ id: "blocked-" + code, kind: "build", role: "house", ...cellCenter(`${x},${y}`, 30) }], f.rules);
    assert.equal(rejected.stores.length, initial.stores.length);
    assert.equal(rejected.events.find((e) => e.commandId === "blocked-" + code)?.reason, "mapped-terrain-blocked");
  }
  const commands = ["first", "overlap"].map((id) => ({ id, kind: "build" as const, role: "house", ...f.suggestions[0] }));
  const placed = step(initial, commands, f.rules);
  assert.equal(placed.stores.length, initial.stores.length + 1);
  assert.equal(placed.events.find((e) => e.commandId === "overlap")?.reason, "occupied-cell");
  const changed = structuredClone(f.rules); changed.geography!.version = "another-map";
  assert.throws(() => step(initial, [], changed), /incompatible map version/);
});
