/** Executable RM1/RM4/RM5 example using the explicitly noncanonical fixture. */
import { readFileSync, writeFileSync } from "node:fs";
import { createState, step } from "../lib/aurum/simulation.ts";
import { record, replay, hash } from "../lib/aurum/replay.ts";
import { judge } from "../lib/aurum/judge.ts";
import type { Command, Rules, Store, Carrier } from "../lib/aurum/rules.ts";
const path =
  process.argv[2] ?? new URL("../fixtures/demo.json", import.meta.url);
const scenario = JSON.parse(readFileSync(path, "utf8")) as {
  rules: Rules;
  stores: Store[];
  carriers: Carrier[];
  classification: string;
};
const initial = createState(scenario.rules, scenario.stores, scenario.carriers);
const commands: Command[] = Array.from({ length: 12 }, (_, i) => ({
  id: "demo-road-" + i,
  kind: "road",
  x: 100 + i * 40,
  y: 140,
}));
let state = initial;
const streams: Command[][] = [];
while (!state.completed && state.tick < scenario.rules.mission.maxTicks) {
  const batch = streams.length ? [] : commands;
  streams.push(batch);
  state = step(state, batch, scenario.rules);
}
const trace = await record(initial, scenario.rules, streams);
const verdict = await judge(trace);
const replayed = await replay(trace);
if ((await hash(replayed)) !== (await hash(state)))
  throw Error("RM4: demo round trip failed");
console.log(
  JSON.stringify(
    { classification: scenario.classification, verdict, replayMatches: true },
    null,
    2,
  ),
);
if (process.argv[3])
  writeFileSync(process.argv[3], JSON.stringify({ trace, verdict }, null, 2));
if (verdict.status !== "VERIFIED") process.exitCode = 1;
