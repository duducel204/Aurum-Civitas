import test from "node:test";
import assert from "node:assert/strict";
import { record, replay, hash } from "../../lib/aurum/replay.ts";
import { fixture, finish, roads, winningTrace } from "./fixture.ts";
test("RT4 RM4: exact replay, tampering, truncation and incompatible rules", async () => {
  const trace = await winningTrace();
  const replayed = await replay(trace);
  assert.equal(await hash(replayed), trace.finalHash);
  const tamper = structuredClone(trace);
  tamper.frames[0].commands[0].x = 999;
  await assert.rejects(() => replay(tamper));
  const cut = structuredClone(trace);
  cut.frames.pop();
  await assert.rejects(() => replay(cut));
  await assert.rejects(() => replay(trace, { ...trace.rules, version: "new" }));
  const f = fixture();
  const r = finish(f.state, f.rules, roads());
  assert.deepEqual(trace, await record(f.state, f.rules, r.streams));
});
