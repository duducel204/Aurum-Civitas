/** RMC / ACD: origin classification and append-only correction chains. */
export const semanticId = "RMC";
export type RegionalRecord = {
  id: string;
  regionId: string;
  origin: "game" | "real";
  sourceRef: string;
  evidenceId: string;
  value: unknown;
  corrects?: string;
};
export function validateRecord(
  record: RegionalRecord,
  previous: RegionalRecord[],
  verifyReal: (evidenceId: string) => boolean,
): RegionalRecord[] {
  if (
    !record.id ||
    !record.regionId ||
    !record.sourceRef ||
    !record.evidenceId ||
    !["game", "real"].includes(record.origin) ||
    record.value === undefined ||
    previous.some((r) => r.id === record.id)
  )
    throw Error("RMC: invalid provenance");
  if (record.origin === "real" && !verifyReal(record.evidenceId))
    throw Error("RMC: real-world evidence unverified");
  if (record.corrects) {
    const old = previous.find((r) => r.id === record.corrects);
    if (
      !old ||
      old.regionId !== record.regionId ||
      old.origin !== record.origin
    )
      throw Error("RMC: correction cannot relabel origin");
  }
  return [...structuredClone(previous), structuredClone(record)];
}
