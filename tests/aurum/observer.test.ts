import test from "node:test";
import assert from "node:assert/strict";
import { observe } from "../../lib/aurum/observer.ts";
import { fixture } from "./fixture.ts";
test("RTD RMD: view cannot mutate nested canonical state", () => {
  const f = fixture();
  const view = observe(f.state);
  assert.throws(() => {
    view.stores[0].inventory.wood = 999;
  });
  assert.equal(f.state.stores[0].inventory.wood, 25);
  assert.notEqual(view.stores, f.state.stores);
});
