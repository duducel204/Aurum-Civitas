import test from "node:test";
import assert from "node:assert/strict";
import { qualify } from "../../lib/aurum/contributions.ts";
import { winningTrace, fixture } from "./fixture.ts";
import { record } from "../../lib/aurum/replay.ts";
test("RTA RMA: independently reviewed replay evidence required for upgrades", async () => {
  const submission = {
    id: "upgrade-1",
    actorId: "alice",
    semanticIds: ["RM3"],
    sourceRef: "commit-new",
    parentRef: "commit-old",
    diffHash: "a".repeat(64),
    era: "foundation",
    kind: "upgrade" as const,
  };
  const review = {
    principal: { id: "bob", verified: true },
    accepted: true,
    allowedReviewerIds: ["bob"],
    worldTick: 100,
    verifySource: (s: {
      sourceRef: string;
      parentRef: string;
      diffHash: string;
    }) =>
      s.sourceRef === submission.sourceRef &&
      s.parentRef === submission.parentRef &&
      s.diffHash === submission.diffHash,
  };
  const trace = await winningTrace();
  const accepted = await qualify(submission, trace, review);
  assert.equal(accepted.status, "accepted");
  assert.equal(accepted.reviewerId, "bob");
  assert.equal(accepted.tick, 100);
  await assert.rejects(() =>
    qualify({ ...submission, sourceRef: "unverified" }, trace, review),
  );
  await assert.rejects(() =>
    qualify(submission, trace, {
      ...review,
      principal: { id: "alice", verified: true },
      allowedReviewerIds: ["alice"],
    }),
  );
  const f = fixture();
  await assert.rejects(async () =>
    qualify(submission, await record(f.state, f.rules, [[]]), review),
  );
});
