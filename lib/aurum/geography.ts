/** RME / IG: immutable map cells, existing roads and bounded physical access. */
import type { Point, State, Rules, Carrier } from "./rules.ts";
export const semanticId = "RME";
export type Geography = {
  id: string;
  version: string;
  sourceTimestamp: string;
  sourceHash: string;
  mapHash: string;
  cols: number;
  rows: number;
  cellSizeM: number;
  lastMileCells: number;
  grid: string[];
};
export type MapFeature = {
  id: string;
  properties: Record<string, string | number>;
  geometry: { type: string; coordinates: number[][] | number[][][] | number[][][][] };
};
export type MapData = {
  metadata: {
    id: string; title: string; sourceTimestamp: string; cols: number;
    rows: number; cellSizeM: number; widthM: number; heightM: number;
    attribution: string; license: string;
  };
  features: MapFeature[];
  grid: string[];
};
export function validateGeography(g: Geography, gridSize: number): void {
  if (!g.id || !g.version || !Number.isFinite(Date.parse(g.sourceTimestamp)) ||
      !/^[a-f0-9]{64}$/.test(g.sourceHash) || !/^[a-f0-9]{64}$/.test(g.mapHash) ||
      !Number.isSafeInteger(g.cols) || g.cols <= 0 ||
      !Number.isSafeInteger(g.rows) || g.rows <= 0 ||
      !Number.isSafeInteger(g.cellSizeM) || g.cellSizeM !== gridSize ||
      g.lastMileCells !== 1 || !Array.isArray(g.grid) || g.grid.length !== g.rows ||
      g.grid.some((r) => r.length !== g.cols || /[^.rbwgf]/.test(r)))
    throw Error("RME: invalid immutable map contract");
}
export function mapVersion(g: Geography): string {
  return `${g.id}:${g.version}:${g.mapHash}:${g.sourceHash}`;
}
export function cellAt(p: Point, g: Geography): { x: number; y: number; code: string; key: string } | null {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
  const x = Math.floor(p.x / g.cellSizeM), y = Math.floor(p.y / g.cellSizeM);
  return x < 0 || y < 0 || x >= g.cols || y >= g.rows
    ? null : { x, y, code: g.grid[y][x], key: `${x},${y}` };
}
export function cellCenter(key: string, size: number): Point {
  const [x, y] = key.split(",").map(Number);
  return { x: (x + 0.5) * size, y: (y + 0.5) * size };
}
export function existingRoads(g: Geography): Record<string, boolean> {
  const roads: Record<string, boolean> = {};
  g.grid.forEach((row, y) => [...row].forEach((c, x) => {
    if (c === "r") roads[`${x},${y}`] = true;
  }));
  return roads;
}
export function roadNeighbors(key: string, roads: State["roads"], diagonal = true): string[] {
  const [x, y] = key.split(",").map(Number);
  const shifts = [[-1, 0], [0, -1], [0, 1], [1, 0]];
  if (diagonal) shifts.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
  return shifts.map(([dx, dy]) => `${x + dx},${y + dy}`).filter((k) => roads[k]);
}
export function roadAccess(p: Point, state: State, rules: Rules): string | null {
  if (!rules.geography || !cellAt(p, rules.geography)) return null;
  const size = rules.gridSize, x = Math.floor(p.x / size), y = Math.floor(p.y / size);
  const candidates: { key: string; d: number }[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const key = `${x + dx},${y + dy}`;
    if (!state.roads[key]) continue;
    const c = cellCenter(key, size), d = Math.hypot(c.x - p.x, c.y - p.y);
    // A last-mile entrance crosses at most one cell; it cannot bypass a river or forest.
    if (d <= size + 1e-7) candidates.push({ key, d });
  }
  return candidates.sort((a, b) => a.d - b.d || a.key.localeCompare(b.key, "en"))[0]?.key ?? null;
}
export function uncachedRoadDistances(start: string, roads: State["roads"]): Map<string, number> {
  const distances = new Map<string, number>();
  if (!roads[start]) return distances;
  distances.set(start, 0);
  const queue = [start];
  for (let i = 0; i < queue.length; i++) for (const n of roadNeighbors(queue[i], roads)) {
    if (distances.has(n)) continue;
    distances.set(n, distances.get(queue[i])! + 1);
    queue.push(n);
  }
  return distances;
}
// DEV-48: bounded transient cache. Key contains the complete current graph;
// additions, deletions and false flags invalidate it without canonical fields.
const distanceCache=new Map<string,Map<string,number>>();
export function roadDistances(start:string,roads:State['roads']):Map<string,number> {
  const signature=Object.keys(roads).filter(k=>roads[k]).sort().join(';');
  const key=start+'|'+signature;
  let result=distanceCache.get(key);
  if(!result){result=uncachedRoadDistances(start,roads);if(distanceCache.size>=32)distanceCache.delete(distanceCache.keys().next().value!);distanceCache.set(key,result);}
  return new Map(result); // callers cannot poison the cached tree
}
export function geographicRoute(origin: Point, target: Point, state: State, rules: Rules): Carrier["route"] {
  const start = roadAccess(origin, state, rules), end = roadAccess(target, state, rules);
  if (!start || !end) return [];
  const queue = [start], previous = new Map<string, string | null>([[start, null]]);
  for (let i = 0; i < queue.length && !previous.has(end); i++) {
    for (const n of roadNeighbors(queue[i], state.roads)) if (!previous.has(n)) {
      previous.set(n, queue[i]); queue.push(n);
    }
  }
  if (!previous.has(end)) return [];
  const path: string[] = [];
  for (let k: string | null = end; k !== null; k = previous.get(k) ?? null) path.push(k);
  path.reverse();
  return [...path.map((k, i) => ({ point: cellCenter(k, rules.gridSize), road: i > 0 })),
    { point: { ...target }, road: false }];
}
export function placementReason(p: Point, state: State, rules: Rules): string {
  const g = rules.geography;
  if (!g) return "";
  const cell = cellAt(p, g);
  if (!cell) return "outside-map";
  if (cell.code !== ".") return "mapped-terrain-blocked";
  if (state.stores.some((s) => cellAt(s.pos, g)?.key === cell.key)) return "occupied-cell";
  const center = cellCenter(cell.key, rules.gridSize);
  if (!roadAccess(center, state, rules)) return "no-road-access";
  if (!state.stores.some((s) => s.kind === "depot" && geographicRoute(s.pos, center, state, rules).length))
    return "no-delivery-route";
  return "";
}
