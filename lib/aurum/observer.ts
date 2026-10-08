/** RMD: recursively frozen snapshot; the observer cannot mutate canonical state. */
import type { State } from "./rules.ts";
export const semanticId = "RMD";
function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const item of Object.values(value)) freeze(item);
  }
  return value;
}
export function observe(state: State): Readonly<State> {
  return freeze(structuredClone(state));
}
