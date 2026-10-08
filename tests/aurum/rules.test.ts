import test from "node:test";
import assert from "node:assert/strict";
import { validateRules } from "../../lib/aurum/rules.ts";
import { fixture } from "./fixture.ts";
test("RT0 RM0: mandatory numeric contracts and recipe versions", () => {
  const f = fixture();
  assert.equal(validateRules(f.rules).version, "test-fixture");
  assert.throws(() => validateRules({ ...f.rules, tickMs: 0 }));
  assert.throws(() => validateRules({ ...f.rules, recipes: {} }));
  assert.throws(() =>
    validateRules({
      ...f.rules,
      construction: { storehouse: { materials: {}, ticks: 1 } },
    }),
  );
});
