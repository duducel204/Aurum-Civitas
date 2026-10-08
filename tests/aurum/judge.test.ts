import test from "node:test";
import assert from "node:assert/strict";
import { judge, compare } from "../../lib/aurum/judge.ts";
import { record } from "../../lib/aurum/replay.ts";
import { fixture, winningTrace, finish } from "./fixture.ts";
test("RT5 RM5: false success rejected and matched runs independently checked", async () => {
  const f = fixture();
  const losing = await record(f.state, f.rules, [[]]);
  assert.equal((await judge(losing)).status, "REJECTED");
  const winning = await winningTrace();
  assert.equal((await judge(winning)).status, "VERIFIED");
  const d = finish(f.state, f.rules);
  const direct = await record(f.state, f.rules, d.streams);
  const result = await compare(direct, winning);
  assert(result.b.ticks < result.a.ticks);
  const different = structuredClone(winning);
  different.rules.mapSeed = "other";
  await assert.rejects(() => compare(direct, different));
});
