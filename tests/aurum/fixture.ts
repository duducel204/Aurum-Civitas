import { readFileSync } from "node:fs";
import type {
  Rules,
  Store,
  Carrier,
  State,
  Command,
} from "../../lib/aurum/rules.ts";
import { createState, step } from "../../lib/aurum/simulation.ts";
import { record } from "../../lib/aurum/replay.ts";
export function fixture() {
  const f = JSON.parse(
    readFileSync(new URL("../../fixtures/demo.json", import.meta.url), "utf8"),
  ) as { rules: Rules; stores: Store[]; carriers: Carrier[] };
  f.rules = {
    ...f.rules,
    version: "test-fixture",
    tickMs: 1000,
    harvestTicks: 1,
    roadSpeed: 10,
    offroadSpeed: 1,
    gridSize: 1,
    recipes: {
      sawmill: { inputs: { wood: 1 }, outputs: { planks: 1 }, ticks: 1 },
    },
    construction: { storehouse: { materials: { planks: 2 }, ticks: 2 } },
    mission: {
      id: "test-fixture",
      resource: "planks",
      delivered: 3,
      maxTicks: 500,
    },
  };
  f.stores[0].pos = { x: 0.5, y: 0.5 };
  f.stores[1].pos = { x: 10.5, y: 0.5 };
  f.stores[2].pos = { x: 15.5, y: 0.5 };
  for (const c of f.carriers) c.pos = { ...f.stores[0].pos };
  return { ...f, state: createState(f.rules, f.stores, f.carriers) };
}
export function roads(): Command[] {
  return Array.from({ length: 16 }, (_, x) => ({
    id: "r" + x,
    kind: "road",
    x: x + 0.5,
    y: 0.5,
  }));
}
export function finish(state: State, rules: Rules, first: Command[] = []) {
  let s = state;
  const streams: Command[][] = [];
  while (!s.completed && s.tick < rules.mission.maxTicks) {
    const c = streams.length ? [] : first;
    streams.push(c);
    s = step(s, c, rules);
  }
  return { s, streams };
}
export async function winningTrace() {
  const f = fixture();
  const run = finish(f.state, f.rules, roads());
  if (!run.s.completed) throw Error("test fixture did not finish");
  return record(f.state, f.rules, run.streams);
}
