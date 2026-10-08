import test from "node:test";
import assert from "node:assert/strict";
import { authorize, bindMembership } from "../../lib/aurum/membership.ts";
test("RT8 RM8: authenticated boundary and cross-territory rights", () => {
  const m = [
    {
      actorId: "a",
      cityId: "city",
      regionId: "forest",
      role: "owner" as const,
    },
  ];
  assert(authorize({ id: "a", verified: true }, "city", m));
  assert(!authorize({ id: "a", verified: false }, "city", m));
  assert(!authorize({ id: "a", verified: true }, "other", m));
  assert.throws(() =>
    bindMembership(
      m,
      { id: "b", verified: true },
      { actorId: "b", cityId: "city", regionId: "forest", role: "member" },
    ),
  );
  const next = bindMembership(
    m,
    { id: "a", verified: true },
    { actorId: "b", cityId: "city", regionId: "forest", role: "member" },
  );
  assert(authorize({ id: "b", verified: true }, "city", next));
  assert.equal(m.length, 1);
});
