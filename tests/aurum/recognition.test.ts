import test from "node:test";
import assert from "node:assert/strict";
import { attribute, correctRecognition } from "../../lib/aurum/recognition.ts";
import { qualify } from "../../lib/aurum/contributions.ts";
import { winningTrace } from "./fixture.ts";
import { canonical } from "../../lib/aurum/rules.ts";
test("RTB RMB: permanent idempotent monuments, explicit era bounds and forged awards rejected", async () => {
  const accepted = await qualify(
    {
      id: "route-1",
      actorId: "alice",
      semanticIds: ["RM3"],
      sourceRef: "new",
      parentRef: "old",
      diffHash: "a".repeat(64),
      era: "foundation",
      kind: "route",
    },
    await winningTrace(),
    {
      principal: { id: "bob", verified: true },
      accepted: true,
      allowedReviewerIds: ["bob"],
      worldTick: 100,
      verifySource: (s: {
        sourceRef: string;
        parentRef: string;
        diffHash: string;
      }) =>
        s.sourceRef === "new" &&
        s.parentRef === "old" &&
        s.diffHash === "a".repeat(64),
    },
  );
  const era = {
    id: "foundation",
    startTick: 0,
    endTick: 500,
    titles: [{ id: "road-pioneer", kind: "route" as const, minimum: 1 }],
  };
  const verify = (c: typeof accepted) => canonical(c) === canonical(accepted);
  const h = attribute([], accepted, era, verify);
  assert.equal(h.length, 2);
  assert.deepEqual(attribute(h, accepted, era, verify), h);
  assert.throws(() =>
    attribute([], { ...accepted, actorId: "faker" }, era, verify),
  );
  assert.throws(() => attribute([], accepted, { ...era, endTick: 1 }, verify));
  const corrected = correctRecognition(
    h,
    h[0].id,
    "independent correction evidence",
  );
  assert.deepEqual(corrected.slice(0, 2), h);
});
