import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createState, step } from "../../lib/aurum/simulation.ts";
import { checkConservation } from "../../lib/aurum/economy.ts";
import { advanceServices } from "../../lib/aurum/infrastructure.ts";
import { record, replay, hash } from "../../lib/aurum/replay.ts";
import { judge } from "../../lib/aurum/judge.ts";
import type { Command, Rules, Store, Carrier } from "../../lib/aurum/rules.ts";
const itaipu = () => JSON.parse(readFileSync(new URL("../../fixtures/itaipu-scenario.json", import.meta.url), "utf8")) as {
  rules: Rules; stores: Store[]; carriers: Carrier[]; suggestions: { x: number; y: number }[];
};
test("RTF RMF: real-map delivery, inhabited home, solar, substation and identical replay", async () => {
  const f = itaipu(), initial = createState(f.rules, f.stores, f.carriers);
  const commands: Command[] = ["house", "solar", "substation"].map((role, i) =>
    ({ id: role, kind: "build", role, ...f.suggestions[i] }));
  const streams: Command[][] = [commands];
  let s = step(initial, commands, f.rules);
  assert.equal(s.services!.residents, 0);
  assert.equal(s.stores.find((store) => store.id === "site:house")!.status, "awaiting_materials");
  while (s.tick < 300 && s.stores.some((s) => s.kind === "site" && s.status !== "operational")) {
    s = step(s, [], f.rules); streams.push([]); assert(checkConservation(s));
  }
  assert.equal(s.services!.residents, 4);
  assert.equal(s.services!.generation, 136);
  assert(s.stores.filter((s) => s.kind === "site").every((s) => s.status === "operational"));
  assert.deepEqual(s.stores.find((s) => s.id === "site:house")!.incorporated, { planks: 4, stone: 2 });
  const trace = await record(initial, f.rules, streams);
  assert.equal(await hash(await replay(trace, f.rules)), await hash(s));
  assert.equal((await judge(trace)).status, "VERIFIED");
  const corrupted = structuredClone(trace); corrupted.frames[0].commands[0].role = "solar";
  await assert.rejects(() => replay(corrupted, f.rules), /checkpoint mismatch/);
});
test("RTF RMF: finite distribution and blackout remove service without creating materials", () => {
  const f = itaipu(), s = createState(f.rules, f.stores, f.carriers);
  const station = f.rules.services!.roles["substation-existing"];
  station.distributionCapacity = 2;
  f.suggestions.slice(0, 2).forEach((pos, i) => s.stores.push({
    id: `home-${i}`, pos, kind: "site", inventory: {}, incorporated: { planks:4, stone:2 },
    capacity:200, construction:"house", status:"operational", buildTicks:12,
  }));
  advanceServices(s, f.rules);
  assert.equal(s.services!.demand, 4);
  assert.equal(s.services!.supplied, 2);
  assert.equal(s.services!.unserved, 2);
  assert.equal(s.services!.residents, 4);
  for (const role of Object.values(f.rules.services!.roles)) role.generation = 0;
  advanceServices(s, f.rules);
  assert.equal(s.services!.residents, 0);
  assert.equal(s.services!.supplied, 0);
  assert.equal(s.services!.unserved, 4);
});
