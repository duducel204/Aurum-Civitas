/** RMB / ACC: permanent append-only recognition tied to accepted evidence. */
import type { Contribution } from "./contributions.ts";
export const semanticId = "RMB";
export type EraContract = {
  id: string;
  startTick: number;
  endTick: number;
  titles: { id: string; kind: Contribution["kind"]; minimum: number }[];
};
export type Recognition = {
  id: string;
  contributionId: string;
  actorId: string;
  era: string;
  kind: string;
  verdictHash: string;
  corrects?: string;
  reason?: string;
};
export function attribute(
  history: Recognition[],
  contribution: Contribution,
  era: EraContract,
  verifyAccepted: (c: Contribution) => boolean,
): Recognition[] {
  if (
    typeof verifyAccepted !== "function" ||
    !verifyAccepted(contribution) ||
    contribution.status !== "accepted" ||
    !contribution.verdictHash ||
    !contribution.reviewerId ||
    contribution.reviewerId === contribution.actorId ||
    contribution.era !== era.id ||
    !Number.isSafeInteger(era.startTick) ||
    !Number.isSafeInteger(era.endTick) ||
    era.endTick < era.startTick ||
    contribution.tick < era.startTick ||
    contribution.tick > era.endTick
  )
    throw Error("RMB: inadmissible historical event");
  if (history.some((e) => e.contributionId === contribution.id))
    return structuredClone(history);
  const next = structuredClone(history);
  next.push({
    id: "recognition:" + contribution.id,
    contributionId: contribution.id,
    actorId: contribution.actorId,
    era: era.id,
    kind: contribution.kind,
    verdictHash: contribution.verdictHash,
  });
  for (const title of era.titles) {
    if (!Number.isSafeInteger(title.minimum) || title.minimum <= 0)
      throw Error("RMB: unresolved title criteria");
    const qualified = next.filter(
      (e) =>
        e.actorId === contribution.actorId &&
        e.era === era.id &&
        e.kind === title.kind &&
        !e.corrects,
    ).length;
    if (
      qualified >= title.minimum &&
      !next.some(
        (e) => e.id === `${era.id}:${title.id}:${contribution.actorId}`,
      )
    )
      next.push({
        id: `${era.id}:${title.id}:${contribution.actorId}`,
        contributionId: contribution.id,
        actorId: contribution.actorId,
        era: era.id,
        kind: "title:" + title.id,
        verdictHash: contribution.verdictHash,
      });
  }
  return next;
}
export function correctRecognition(
  history: Recognition[],
  id: string,
  reason: string,
): Recognition[] {
  const original = history.find((e) => e.id === id);
  if (!original || !reason) throw Error("RMB: missing correction evidence");
  return [
    ...structuredClone(history),
    {
      ...original,
      id: `correction:${history.length}:${id}`,
      corrects: id,
      kind: "correction",
      reason,
    },
  ];
}
