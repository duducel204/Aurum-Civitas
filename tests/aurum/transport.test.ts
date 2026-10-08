import test from "node:test";
import assert from "node:assert/strict";
import { route, advanceTransport } from "../../lib/aurum/transport.ts";
import { checkConservation } from "../../lib/aurum/economy.ts";
import { fixture, finish, roads } from "./fixture.ts";
import { step, run } from "../../lib/aurum/simulation.ts";
test("RT3 RM3: persistent progress and measured connected-road benefit", () => {
  const f = fixture();
  const direct = finish(f.state, f.rules);
  const connected = finish(f.state, f.rules, roads());
  assert(direct.s.completed && connected.s.completed);
  assert(
    connected.s.tick < direct.s.tick,
    `${connected.s.tick} < ${direct.s.tick}`,
  );
  assert(checkConservation(connected.s));
});
test("RT3 RM3: disconnected road blocks without teleporting or dropping cargo", () => {
  const f = fixture();
  f.rules.allowOffroad = false;
  const blocked = run(f.state, f.rules, 10);
  assert(blocked.carriers.some((c) => c.phase === "blocked"));
  assert.equal(blocked.stores[0].inventory.wood, 25);
  assert(checkConservation(blocked));
  assert.equal(
    route(f.stores[0].pos, f.stores[1].pos, f.state, f.rules).length,
    0,
  );
  const resume = run(step(blocked, roads(), f.rules), f.rules, 100);
  assert((resume.produced.planks ?? 0) > 0);
  assert(checkConservation(resume));
});
test("RT3 RM3: base inventory physically supplies sawmill and bounded delivery waits", () => {
  const f = fixture();
  f.state.stores[0].inventory = {};
  f.state.stores[2].inventory = { wood: 3 };
  f.state.initialTotal = { wood: 3 };
  const s = run(f.state, f.rules, 200, { 1: roads() });
  assert.equal(s.produced.planks, 3);
  assert(checkConservation(s));
  const full = fixture();
  full.state.stores[1].capacity = 1;
  let small = run(full.state, full.rules, 200, { 1: roads() });
  assert((small.stores[1].inventory.wood ?? 0) <= 1);
  assert(small.completed, "bounded buffer must remain live");
  assert(checkConservation(small));
});
