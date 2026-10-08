/** RM0 / AC1: mandatory configuration and canonical state contracts. */
export const semanticId = "RM0";
export type Stock = Record<string, number>;
export type Point = { x: number; y: number };
export type Recipe = { inputs: Stock; outputs: Stock; ticks: number };
export type Rules = {
  version: string;
  tickMs: number;
  mapSeed: string;
  capacity: number;
  harvestTicks: number;
  roadSpeed: number;
  offroadSpeed: number;
  gridSize: number;
  allowOffroad: boolean;
  recipes: Record<string, Recipe>;
  construction: Record<string, { materials: Stock; ticks: number }>;
  mission: {
    id: string;
    resource: string;
    delivered: number;
    maxTicks: number;
  };
};
export type Store = {
  id: string;
  pos: Point;
  kind: "source" | "depot" | "producer" | "site";
  inventory: Stock;
  capacity: number;
  recipe?: string;
  construction?: string;
  incorporated: Stock;
  work?: { recipe: string; ticks: number; inputs: Stock };
  buildTicks: number;
  status: "awaiting_materials" | "building" | "operational";
  cityId?: string;
};
export type Carrier = {
  id: string;
  pos: Point;
  cargo: Stock;
  target: string | null;
  source: string | null;
  route: { point: Point; road: boolean }[];
  waypoint: number;
  roadVersion: number;
  phase: "idle" | "pickup" | "harvesting" | "moving" | "blocked";
  harvest: number;
  job?: { resource: string; destination: string };
};
export type Event = {
  semantic_id: string;
  tick: number;
  kind: string;
  [key: string]: unknown;
};
export type Command = {
  id: string;
  kind: "road" | "build";
  x: number;
  y: number;
  role?: string;
};
export type State = {
  tick: number;
  version: number;
  rulesVersion: string;
  stores: Store[];
  carriers: Carrier[];
  roads: Record<string, boolean>;
  roadVersion: number;
  produced: Stock;
  incorporated: Stock;
  bootstrap: Stock;
  events: Event[];
  commandIds: string[];
  initialTotal: Stock;
  completed: boolean;
};
export function stockValid(stock: Stock): boolean {
  return (
    !!stock &&
    Object.keys(stock).length > 0 &&
    Object.values(stock).every((v) => Number.isSafeInteger(v) && v >= 0)
  );
}
export function validateRules(r: Rules): Rules {
  if (
    !r ||
    !r.version ||
    !r.mapSeed ||
    !r.mission?.id ||
    !r.mission.resource ||
    typeof r.allowOffroad !== "boolean"
  )
    throw Error("RM0: unresolved mandatory contract");
  for (const n of [
    r.tickMs,
    r.capacity,
    r.harvestTicks,
    r.gridSize,
    r.mission.delivered,
    r.mission.maxTicks,
  ])
    if (!Number.isSafeInteger(n) || n <= 0)
      throw Error("RM0: positive integer required");
  for (const n of [r.roadSpeed, r.offroadSpeed])
    if (!Number.isFinite(n) || n <= 0) throw Error("RM0: speed required");
  if (
    !r.recipes ||
    !Object.keys(r.recipes).length ||
    !r.construction ||
    !Object.keys(r.construction).length
  )
    throw Error("RM0: recipes/construction unresolved");
  for (const recipe of Object.values(r.recipes))
    if (
      !stockValid(recipe.inputs) ||
      !stockValid(recipe.outputs) ||
      !Object.values(recipe.inputs).some((v) => v > 0) ||
      !Object.values(recipe.outputs).some((v) => v > 0) ||
      !Number.isSafeInteger(recipe.ticks) ||
      recipe.ticks <= 0
    )
      throw Error("RM0: incomplete recipe");
  for (const b of Object.values(r.construction))
    if (
      !stockValid(b.materials) ||
      !Object.values(b.materials).some((v) => v > 0) ||
      !Number.isSafeInteger(b.ticks) ||
      b.ticks <= 0
    )
      throw Error("RM0: incomplete construction");
  return structuredClone(r);
}
export function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b, "en"))
      .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
      .join(",") +
    "}"
  );
}
