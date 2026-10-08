import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { createState, step } from "../lib/aurum/simulation.ts";
import { checkConservation } from "../lib/aurum/economy.ts";
import { record, replay, hash } from "../lib/aurum/replay.ts";
import { judge } from "../lib/aurum/judge.ts";
import type { Rules, Store, Carrier, Command } from "../lib/aurum/rules.ts";
const f = JSON.parse(readFileSync(new URL("../fixtures/itaipu-scenario.json", import.meta.url), "utf8")) as {
  rules: Rules; stores: Store[]; carriers: Carrier[]; suggestions: { x: number; y: number }[];
};
const initial = createState(f.rules, f.stores, f.carriers);
const commands: Command[] = ["house", "solar", "substation"].map((role, i) => ({ id:role,kind:"build",role,...f.suggestions[i] }));
const streams: Command[][] = [commands];
let s = step(initial, commands, f.rules);
while (s.tick < 300 && s.stores.some((s) => s.kind === "site" && s.status !== "operational")) {
  s = step(s, [], f.rules); streams.push([]);
}
assert(s.stores.filter((s) => s.kind === "site").every((s) => s.status === "operational"));
assert(checkConservation(s));
const trace = await record(initial, f.rules, streams), restored = await replay(trace, f.rules);
assert.equal(await hash(s), await hash(restored));
const verdict = await judge(trace);
assert.equal(verdict.status, "VERIFIED");
const receipt = {
  semantic_ids:["RME","RMF","RM1","RM2","RM3","RM4","RM5"],
  sourceHash:f.rules.geography!.sourceHash,mapHash:f.rules.geography!.mapHash,
  roadCells:Object.keys(initial.roads).length,roadCommands:0,ticks:s.tick,
  operational:s.stores.filter((s) => s.kind === "site").map((s) => ({id:s.id,incorporated:s.incorporated})),
  services:s.services,conservation:true,replayIdentical:true,verdict,
  browser_playtest:"DEFERRED_TO_USER",
};
writeFileSync(new URL("../evidence/itaipu.json", import.meta.url),JSON.stringify(receipt,null,2)+"\n");
console.log(JSON.stringify({ticks:s.tick,roadCells:receipt.roadCells,residents:s.services!.residents,generation:s.services!.generation,replay:verdict.status}));
