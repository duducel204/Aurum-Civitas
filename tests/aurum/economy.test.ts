import test from "node:test";
import assert from "node:assert/strict";
import { checkConservation, total } from "../../lib/aurum/economy.ts";
import { run, step } from "../../lib/aurum/simulation.ts";
import { fixture, roads } from "./fixture.ts";
test("RT2 RM2: last finite unit, recipe balance and delivered construction", () => {
  const f = fixture();
  f.state.stores[0].inventory.wood = 1;
  f.state.initialTotal = { wood: 1 };
  let s = run(f.state, f.rules, 100, { 1: roads() });
  assert(checkConservation(s));
  assert.equal(s.produced.planks, 1);
  assert.equal(total(s).wood ?? 0, 0);
  assert.equal(total(s).planks, 1);
  assert.equal(
    s.carriers.reduce((n, c) => n + (c.cargo.wood ?? 0), 0),
    0,
  );
  const fresh = fixture();
  let building = step(
    fresh.state,
    [
      { id: "build", kind: "build", role: "storehouse", x: 16.5, y: 0.5 },
      ...roads(),
    ],
    fresh.rules,
  );
  assert.equal(building.stores.at(-1)!.status, "awaiting_materials");
  building = run(building, fresh.rules, 150);
  const site = building.stores.find((s) => s.id === "site:build")!;
  assert.equal(site.status, "operational");
  assert.equal(site.incorporated.planks, 2);
  assert(checkConservation(building));
});
