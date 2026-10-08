/** DEV-03/41/42: Itaipu's virtual forestry chain uses the canonical economy. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createState, step } from "../../lib/aurum/simulation.ts";
import { checkConservation } from "../../lib/aurum/economy.ts";
import { geographicRoute } from "../../lib/aurum/geography.ts";
import { canonical } from "../../lib/aurum/rules.ts";
import type { Rules, Store, Carrier } from "../../lib/aurum/rules.ts";

const fixture = JSON.parse(readFileSync(new URL("../../fixtures/itaipu-scenario.json", import.meta.url), "utf8")) as {
  rules: Rules; stores: Store[]; carriers: Carrier[];
};

test("DEV-03: wood physically reaches sawmill, planks reach depot, stocks remain conserved", () => {
  const start = createState(fixture.rules, fixture.stores, fixture.carriers);
  const forest = start.stores.find(s => s.id === "itaipu:forest-source-1")!;
  const mill = start.stores.find(s => s.id === "itaipu:sawmill-1")!;
  const depot = start.stores.find(s => s.id === "itaipu:depot")!;
  assert.ok(geographicRoute(forest.pos, mill.pos, start, fixture.rules).length);
  assert.ok(geographicRoute(mill.pos, depot.pos, start, fixture.rules).length);
  let end = start;
  let received = false;
  for (let tick = 0; tick < 600 && !received; tick++) {
    end = step(end, [], fixture.rules);
    received = end.events.some(e => e.kind === "delivered" && e.target === depot.id && e.resource === "planks");
  }
  assert.ok(received, "production loop must close within 600 ticks");
  assert.ok(end.events.some(e => e.kind === "recipe-completed" && e.store === mill.id),
    "sawmill must actually process delivered wood");
  assert.ok(end.events.some(e => e.kind === "delivered" && e.target === depot.id && e.resource === "planks"),
    "produced planks must be physically carried to depot");
  assert.ok(end.stores.find(s => s.id === forest.id)!.inventory.wood < 50,
    "finite forest stock must decrease");
  assert.ok(checkConservation(end), "every input, output, cargo and incorporated material must reconcile");
  let again = createState(fixture.rules, fixture.stores, fixture.carriers);
  for (let tick = 0; tick < end.tick; tick++) again = step(again, [], fixture.rules);
  assert.equal(canonical(end), canonical(again),
    "repeated simulation must be deterministic");
});
