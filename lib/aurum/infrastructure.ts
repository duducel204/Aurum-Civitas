/** RMF / IH+IE: generation, distribution capacity and serviced housing per tick.
 * Power uses explicit game circuits; it is not a transported material stock.
 */
import type { State, Rules, Store } from "./rules.ts";
import { roadAccess, roadDistances } from "./geography.ts";
export const semanticId = "RMF";
export type ServiceRole = {
  label: string;
  housing: number;
  generation: number;
  demand: number;
  distributionCapacity: number;
  distributionCells: number;
  connectionCells: number;
};
export type ServicesRules = {
  classification: "EXPERIMENTAL_GAME_UNITS";
  roles: Record<string, ServiceRole>;
  // OSM identifies facilities, not their electrical wiring. These are declared scenario circuits.
  existingLinks: { from: string; to: string }[];
};
export type ServiceStatus = {
  role: string;
  powered: boolean;
  supplied: number;
  demand: number;
  residents: number;
  housing: number;
  generation: number;
  provider: string | null;
  reason: string;
};
export type ServicesState = {
  generation: number;
  demand: number;
  supplied: number;
  curtailed: number;
  unserved: number;
  housing: number;
  residents: number;
  poweredHouses: number;
  buildings: Record<string, ServiceStatus>;
  connections: { from: string; to: string; kind: "existing" | "road-corridor" }[];
};
export function validateServices(s: ServicesRules): void {
  if (s.classification !== "EXPERIMENTAL_GAME_UNITS" || !Object.keys(s.roles).length ||
      !Array.isArray(s.existingLinks)) throw Error("RMF: missing service contract");
  for (const r of Object.values(s.roles)) {
    if (!r.label || [r.housing, r.generation, r.demand, r.distributionCapacity,
      r.distributionCells, r.connectionCells].some((n) => !Number.isSafeInteger(n) || n < 0) ||
      (r.housing > 0 && r.demand === 0)) throw Error("RMF: invalid service role");
  }
  if (s.existingLinks.some((l) => !l.from || !l.to || l.from === l.to))
    throw Error("RMF: invalid circuit");
}
const storeRole = (s: Store) => s.serviceRole ?? s.construction;
export function advanceServices(state: State, rules: Rules): void {
  const config = rules.services;
  if (!config) return;
  const before = state.services;
  const stores = [...state.stores].sort((a, b) => a.id.localeCompare(b.id, "en"));
  const active = stores.filter((s) => s.status === "operational" && config.roles[storeRole(s)!]);
  const hubs = active.filter((s) => {
    const role = config.roles[storeRole(s)!];
    return role.generation > 0 || role.distributionCapacity > 0;
  });
  const distances = new Map(hubs.map((s) => {
    const key = roadAccess(s.pos, state, rules);
    return [s.id, key ? roadDistances(key, state.roads) : new Map<string, number>()];
  }));
  const roleOf = (s: Store) => config.roles[storeRole(s)!];
  const parents = new Map(hubs.map((s) => [s.id, s.id]));
  const root = (id: string): string => {
    let current = id;
    while (parents.get(current) !== current) current = parents.get(current)!;
    return current;
  };
  const connect = (a: string, b: string) => { if (root(a) !== root(b)) parents.set(root(b), root(a)); };
  const connections: ServicesState["connections"] = [];
  for (const l of config.existingLinks) if (parents.has(l.from) && parents.has(l.to)) {
    connect(l.from, l.to); connections.push({ ...l, kind: "existing" });
  }
  for (let i = 0; i < hubs.length; i++) for (let j = i + 1; j < hubs.length; j++) {
    const a = hubs[i], b = hubs[j], key = roadAccess(b.pos, state, rules);
    const d = key ? distances.get(a.id)!.get(key) : undefined;
    const limit = Math.min(roleOf(a).connectionCells, roleOf(b).connectionCells);
    if (limit > 0 && d !== undefined && d <= limit) {
      connect(a.id, b.id); connections.push({ from: a.id, to: b.id, kind: "road-corridor" });
    }
  }
  const available = new Map<string, number>();
  for (const h of hubs) available.set(root(h.id), (available.get(root(h.id)) ?? 0) + roleOf(h).generation);
  const energized = new Set([...available].filter(([, n]) => n > 0).map(([id]) => id));
  const capacity = new Map(hubs.map((h) => [h.id, roleOf(h).distributionCapacity]));
  const next: ServicesState = {
    generation: hubs.reduce((n, h) => n + roleOf(h).generation, 0), demand: 0,
    supplied: 0, curtailed: 0, unserved: 0, housing: 0, residents: 0, poweredHouses: 0,
    buildings: {}, connections,
  };
  for (const s of stores) {
    const role = storeRole(s), def = role ? config.roles[role] : undefined;
    if (!role || !def) continue;
    const operational = s.status === "operational";
    let supplied = 0, provider: string | null = null;
    const demand = operational ? def.demand : 0;
    const key = roadAccess(s.pos, state, rules);
    const candidates = hubs.map((h) => ({ hub: h, d: key ? distances.get(h.id)!.get(key) : undefined }))
      .filter((h) => h.d !== undefined && h.d <= roleOf(h.hub).distributionCells && energized.has(root(h.hub.id)))
      .sort((a, b) => a.d! - b.d! || a.hub.id.localeCompare(b.hub.id, "en"));
    if (demand > 0) for (const { hub } of candidates) {
      const delivered = Math.min(demand - supplied, available.get(root(hub.id)) ?? 0, capacity.get(hub.id) ?? 0);
      if (delivered <= 0) continue;
      supplied += delivered; provider ??= hub.id;
      available.set(root(hub.id), available.get(root(hub.id))! - delivered);
      capacity.set(hub.id, capacity.get(hub.id)! - delivered);
      if (supplied === demand) break;
    }
    const powered = operational && (demand > 0 ? supplied === demand : parents.has(s.id) && energized.has(root(s.id)));
    const residents = powered ? def.housing : 0;
    const reason = !operational ? s.status : !key ? "no-road-access" : !powered
      ? candidates.length ? "insufficient-power" : "no-powered-distribution" : "serviced";
    next.buildings[s.id] = {
      role, powered, supplied, demand, residents, housing: operational ? def.housing : 0,
      generation: operational ? def.generation : 0, provider, reason,
    };
    next.demand += demand; next.supplied += supplied;
    next.housing += operational ? def.housing : 0; next.residents += residents;
    if (residents > 0) next.poweredHouses++;
    if (before?.buildings[s.id]?.reason !== reason || before?.buildings[s.id]?.residents !== residents)
      state.events.push({ semantic_id: semanticId, tick: state.tick, kind: "service-changed", store: s.id, reason, residents });
  }
  next.curtailed = next.generation - next.supplied;
  next.unserved = next.demand - next.supplied;
  if (next.curtailed < 0 || next.unserved < 0) throw Error("RMF: power balance violation");
  state.services = next;
}
