import test from "node:test";
import assert from "node:assert/strict";
import { validateRecord } from "../../lib/aurum/provenance.ts";
test("RTC RMC: provenance required, append corrections and never relabel fiction as reality", () => {
  const r = {
    id: "1",
    regionId: "forest",
    origin: "game" as const,
    sourceRef: "run-1",
    evidenceId: "trace-1",
    value: { wood: 2 },
  };
  const h = validateRecord(r, [], () => false);
  assert.throws(() =>
    validateRecord({ ...r, id: "2", origin: "real" }, h, () => false),
  );
  assert.throws(() =>
    validateRecord(
      { ...r, id: "2", origin: "real", corrects: "1" },
      h,
      () => true,
    ),
  );
  const corrected = validateRecord(
    { ...r, id: "2", corrects: "1", value: { wood: 1 } },
    h,
    () => false,
  );
  assert.deepEqual(corrected[0], r);
  assert.equal(corrected.length, 2);
  assert.throws(() =>
    validateRecord({ ...r, evidenceId: "" }, [], () => false),
  );
});
