/** RMA / ACB: replayed contribution plus independent human review. */
import { judge } from "./judge.ts";
import { hash } from "./replay.ts";
import type { Trace } from "./replay.ts";
import type { Principal } from "./membership.ts";
export const semanticId = "RMA";
export type Contribution = {
  id: string;
  actorId: string;
  missionId: string;
  semanticIds: string[];
  sourceRef: string;
  parentRef: string;
  diffHash: string;
  tick: number;
  era: string;
  verdictHash: string;
  reviewerId: string;
  status: "accepted";
  kind: "founder" | "route" | "upgrade";
};
export async function qualify(
  submission: Omit<
    Contribution,
    "status" | "verdictHash" | "reviewerId" | "tick" | "missionId"
  >,
  trace: Trace,
  review: {
    principal: Principal;
    accepted: boolean;
    allowedReviewerIds: string[];
    worldTick: number;
    verifySource: (submission: {
      sourceRef: string;
      parentRef: string;
      diffHash: string;
    }) => boolean;
  },
): Promise<Contribution> {
  if (
    !submission.id ||
    !submission.actorId ||
    !submission.sourceRef ||
    !submission.parentRef ||
    submission.sourceRef === submission.parentRef ||
    !/^[a-f0-9]{64}$/.test(submission.diffHash) ||
    !submission.semanticIds.length ||
    submission.semanticIds.some((id) => !/^RM[0-9A-D]$/.test(id)) ||
    !submission.era ||
    !["founder", "route", "upgrade"].includes(submission.kind) ||
    !review.accepted ||
    !Number.isSafeInteger(review.worldTick) ||
    review.worldTick < 0 ||
    typeof review.verifySource !== "function" ||
    !review.verifySource(submission) ||
    !review.principal.verified ||
    !review.allowedReviewerIds.includes(review.principal.id) ||
    review.principal.id === submission.actorId
  )
    throw Error("RMA: invalid or self-reviewed contribution");
  const verdict = await judge(trace);
  if (verdict.status !== "VERIFIED") throw Error("RMA: mission proof rejected");
  return {
    ...structuredClone(submission),
    tick: review.worldTick,
    missionId: verdict.missionId,
    verdictHash: await hash(verdict),
    reviewerId: review.principal.id,
    status: "accepted",
  };
}
