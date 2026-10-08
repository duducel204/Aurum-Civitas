import test from "node:test";
import assert from "node:assert/strict";
import { step, run } from "../../lib/aurum/simulation.ts";
import { fixture, roads } from "./fixture.ts";
test("RT1 RM1: deterministic ticks, exact ordering and rejected commands", () => {
  const f = fixture();
  const original = structuredClone(f.state);
  assert.deepEqual(
    step(f.state, roads(), f.rules),
    step(f.state, roads(), f.rules),
  );
  assert.deepEqual(f.state, original);
  const bad = step(
    f.state,
    [{ id: "bad", kind: "build", role: "unknown", x: 0, y: 0 }],
    f.rules,
  );
  assert.equal(bad.stores.length, f.state.stores.length);
  assert.equal(bad.events[0].kind, "command-rejected");
  const retry = step(bad, [{ id: "bad", kind: "road", x: 0, y: 0 }], f.rules);
  assert.deepEqual(retry.roads, {});
  assert.deepEqual(
    run(f.state, f.rules, 10),
    run(run(f.state, f.rules, 4), f.rules, 6),
  );
  assert.throws(() => step(f.state, [], { ...f.rules, version: "changed" }));
});
