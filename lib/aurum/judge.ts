/** RM5 / AC6: derive outcome from independently replayed state, not client claims. */
import type { Trace } from "./replay.ts";
import { replay, hash } from "./replay.ts";
import { amount, checkConservation } from "./economy.ts";
export const semanticId = "RM5";
export type Verdict = {
  semantic_id: string;
  status: "VERIFIED" | "REJECTED";
  missionId: string;
  stateHash: string;
  rulesHash: string;
  ticks: number;
  delivered: number;
  acceptedCommands: number;
  reason?: string;
};
export async function judge(trace: Trace): Promise<Verdict> {
  const state = await replay(trace);
  const delivered = state.stores
    .filter((s) => s.kind === "depot")
    .reduce((n, s) => n + amount(s.inventory, trace.rules.mission.resource), 0);
  const valid =
    checkConservation(state) &&
    delivered >= trace.rules.mission.delivered &&
    state.tick <= trace.rules.mission.maxTicks;
  return {
    semantic_id: semanticId,
    status: valid ? "VERIFIED" : "REJECTED",
    missionId: trace.rules.mission.id,
    stateHash: await hash(state),
    rulesHash: await hash(trace.rules),
    ticks: state.tick,
    delivered,
    acceptedCommands: state.events.filter((e) => e.kind === "command-accepted")
      .length,
    ...(!valid ? { reason: "mission-evidence-insufficient" } : {}),
  };
}
export async function compare(a: Trace, b: Trace) {
  if (
    (await hash(a.initial)) !== (await hash(b.initial)) ||
    (await hash(a.rules)) !== (await hash(b.rules))
  )
    throw Error("RM5: unmatched inputs");
  return { a: await judge(a), b: await judge(b) };
}
