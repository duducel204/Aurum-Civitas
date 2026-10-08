import test from "node:test";
import assert from "node:assert/strict";
import {
  createWorld,
  submit,
  advanceWorld,
  restoreWorld,
} from "../../lib/aurum/world.ts";
import { recordWorld, replayWorld, hash } from "../../lib/aurum/replay.ts";
export function worldFixture() {
  return createWorld(
    [
      { id: "a", regionId: "forest", inventory: { wood: 2 }, capacity: 4 },
      { id: "b", regionId: "fertile", inventory: {}, capacity: 4 },
    ],
    [{ actorId: "alice", cityId: "a", regionId: "forest", role: "owner" }],
    [{ from: "a", to: "b", ticks: 3 }],
  );
}
test("RT9/RT4 RM9/RM4: ordered cross-city replay reproduces canonical checkpoint", async () => {
  const w = worldFixture();
  const resolve = (id: string) => ({ id, verified: id === "alice" });
  const trace = await recordWorld(
    w,
    [
      {
        kind: "trade",
        actorId: "alice",
        command: {
          id: "t",
          expectedVersion: 0,
          from: "a",
          to: "b",
          resource: "wood",
          quantity: 2,
        },
      },
      { kind: "tick" },
      { kind: "tick" },
      { kind: "tick" },
    ],
    resolve,
  );
  const result = await replayWorld(trace, resolve);
  assert.equal(result.cities[1].inventory.wood, 2);
  assert.equal(await hash(result), trace.finalHash);
  const changed = structuredClone(trace);
  changed.frames.pop();
  await assert.rejects(() => replayWorld(changed, resolve));
});
test("RT9 RM9: shared order, finite transit, retries, concurrent claims and checkpoint recovery", () => {
  const w = worldFixture(),
    p = { id: "alice", verified: true },
    c = {
      id: "trade",
      expectedVersion: 0,
      from: "a",
      to: "b",
      resource: "wood",
      quantity: 2,
    };
  const first = submit(w, p, c);
  assert(first.result.accepted);
  assert.equal(first.state.cities[1].inventory.wood ?? 0, 0);
  assert.deepEqual(submit(first.state, p, c).state, first.state);
  const stale = submit(first.state, p, { ...c, id: "competing" });
  assert(!stale.result.accepted);
  const over = submit(stale.state, p, {
    ...c,
    id: "over",
    expectedVersion: stale.state.version,
  });
  assert.equal(over.result.reason, "insufficient-stock");
  let state = advanceWorld(advanceWorld(first.state));
  assert.equal(state.cities[1].inventory.wood ?? 0, 0);
  state = advanceWorld(state);
  assert.equal(state.cities[1].inventory.wood, 2);
  assert.equal(advanceWorld(state).cities[1].inventory.wood, 2);
  assert.deepEqual(restoreWorld(JSON.stringify(state)), state);
  assert(!submit(w, { id: "intruder", verified: true }, c).result.accepted);
});
test("RT9 RM9: disconnected routes and capacity-limited arrival conserve transit", () => {
  const w = worldFixture();
  w.links = [];
  const c = {
    id: "trade",
    expectedVersion: 0,
    from: "a",
    to: "b",
    resource: "wood",
    quantity: 2,
  };
  assert.equal(
    submit(w, { id: "alice", verified: true }, c).result.reason,
    "disconnected",
  );
  w.links = [{ from: "a", to: "b", ticks: 1 }];
  w.cities[1].inventory = { stone: 4 };
  let s = advanceWorld(submit(w, { id: "alice", verified: true }, c).state);
  assert.equal(s.shipments[0].status, "blocked");
  assert.equal(s.cities[0].inventory.wood, 0);
  assert.equal(s.shipments[0].quantity, 2);
  s.cities[1].inventory = {};
  s = advanceWorld(s);
  assert.equal(s.cities[1].inventory.wood, 2);
});
