/** RM4 / AC5: complete versioned checkpoints with SHA-256 and exact replay. */
import { canonical } from "./rules.ts";
import type { Rules, State, Command } from "./rules.ts";
import { step } from "./simulation.ts";
import { submit, advanceWorld, restoreWorld } from "./world.ts";
import type { WorldState, TradeCommand } from "./world.ts";
import type { Principal } from "./membership.ts";
export const semanticId = "RM4";
export type Trace = {
  semantic_id: string;
  rules: Rules;
  initial: State;
  initialHash: string;
  finalHash: string;
  frameCount: number;
  frames: {
    tick: number;
    commands: Command[];
    previous_hash: string;
    next_hash: string;
  }[];
};
export async function hash(value: unknown): Promise<string> {
  const data = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical(value)),
  );
  return Array.from(new Uint8Array(data), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
}
export async function record(
  initial: State,
  rules: Rules,
  streams: Command[][],
): Promise<Trace> {
  const initialHash = await hash(initial);
  const trace: Trace = {
    semantic_id: semanticId,
    rules: structuredClone(rules),
    initial: structuredClone(initial),
    initialHash,
    finalHash: initialHash,
    frameCount: streams.length,
    frames: [],
  };
  let state = structuredClone(initial),
    previous_hash = initialHash;
  for (const commands of streams) {
    state = step(state, commands, rules);
    const next_hash = await hash(state);
    trace.frames.push({
      tick: state.tick,
      commands: structuredClone(commands),
      previous_hash,
      next_hash,
    });
    previous_hash = next_hash;
  }
  trace.finalHash = previous_hash;
  return trace;
}
export async function replay(
  trace: Trace,
  expectedRules?: Rules,
): Promise<State> {
  if (
    trace.semantic_id !== semanticId ||
    trace.frames.length !== trace.frameCount ||
    (expectedRules && canonical(expectedRules) !== canonical(trace.rules)) ||
    (await hash(trace.initial)) !== trace.initialHash
  )
    throw Error("RM4: incompatible or tampered trace");
  let state = structuredClone(trace.initial),
    previous = trace.initialHash;
  for (const frame of trace.frames) {
    if (frame.tick !== state.tick + 1 || frame.previous_hash !== previous)
      throw Error("RM4: incomplete trace");
    state = step(state, frame.commands, trace.rules);
    previous = await hash(state);
    if (previous !== frame.next_hash) throw Error("RM4: checkpoint mismatch");
  }
  if (previous !== trace.finalHash)
    throw Error("RM4: terminal checkpoint mismatch");
  return state;
}
export type WorldAction =
  | { kind: "tick" }
  | { kind: "trade"; actorId: string; command: TradeCommand };
export type WorldTrace = {
  semantic_id: "RM4";
  initial: WorldState;
  initialHash: string;
  finalHash: string;
  frameCount: number;
  frames: { action: WorldAction; previous_hash: string; next_hash: string }[];
};
function applyWorld(
  state: WorldState,
  action: WorldAction,
  resolve: (id: string) => Principal,
): WorldState {
  return action.kind === "tick"
    ? advanceWorld(state)
    : submit(state, resolve(action.actorId), action.command).state;
}
export async function recordWorld(
  initial: WorldState,
  actions: WorldAction[],
  resolve: (id: string) => Principal,
): Promise<WorldTrace> {
  let state = restoreWorld(JSON.stringify(initial)),
    previous = await hash(initial);
  const trace: WorldTrace = {
    semantic_id: "RM4",
    initial: structuredClone(initial),
    initialHash: previous,
    finalHash: previous,
    frameCount: actions.length,
    frames: [],
  };
  for (const action of actions) {
    state = applyWorld(state, action, resolve);
    const next = await hash(state);
    trace.frames.push({
      action: structuredClone(action),
      previous_hash: previous,
      next_hash: next,
    });
    previous = next;
  }
  trace.finalHash = previous;
  return trace;
}
export async function replayWorld(
  trace: WorldTrace,
  resolve: (id: string) => Principal,
): Promise<WorldState> {
  if (
    trace.semantic_id !== "RM4" ||
    trace.frameCount !== trace.frames.length ||
    (await hash(trace.initial)) !== trace.initialHash
  )
    throw Error("RM4: invalid world trace");
  let state = restoreWorld(JSON.stringify(trace.initial)),
    previous = trace.initialHash;
  for (const f of trace.frames) {
    if (f.previous_hash !== previous) throw Error("RM4: world trace gap");
    state = applyWorld(state, f.action, resolve);
    previous = await hash(state);
    if (previous !== f.next_hash) throw Error("RM4: world trace mismatch");
  }
  if (previous !== trace.finalHash) throw Error("RM4: incomplete world trace");
  return state;
}
