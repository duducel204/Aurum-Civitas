import test from "node:test";
import assert from "node:assert/strict";
import { advanceEcology } from "../../lib/aurum/sustainability.ts";
test("RT7 RM7: explicit hunger, finite harvest and bounded regeneration", () => {
  const rules = {
    foodPerPerson: 1,
    regrowth: 2,
    forestCapacity: 10,
    harvestLimit: 3,
  };
  const before = {
    food: 1,
    population: 2,
    forest: 9,
    tick: 0,
    status: "sustained" as const,
    events: [],
  };
  const next = advanceEcology(before, rules, 3);
  assert.equal(next.status, "starving");
  assert.equal(next.food, 0);
  assert.equal(next.forest, 8);
  assert.equal(next.events[2].quantity, 2);
  assert.equal(before.forest, 9);
  assert.throws(() => advanceEcology(before, rules, 4));
  assert.equal(advanceEcology({ ...before, food: 3 }, rules, 0).forest, 10);
});
