/** RM9 / AC8: authoritative ordered commands and physical cross-city shipments.
 * Wire protocol, authentication and durable store are intentionally not bound.
 */
import type { Stock } from "./rules.ts";
import { amount, add, count } from "./economy.ts";
import { authorize } from "./membership.ts";
import type { Principal, Membership } from "./membership.ts";
import { hash } from "./replay.ts";
export const semanticId = "RM9";
export type City = {
  id: string;
  regionId: string;
  inventory: Stock;
  capacity: number;
};
export type WorldLink = { from: string; to: string; ticks: number };
export type Shipment = {
  id: string;
  from: string;
  to: string;
  resource: string;
  quantity: number;
  path: string[];
  edge: number;
  remaining: number;
  status: "moving" | "blocked" | "delivered";
};
export type TradeCommand = {
  id: string;
  expectedVersion: number;
  from: string;
  to: string;
  resource: string;
  quantity: number;
};
export type TradeResult = {
  id: string;
  accepted: boolean;
  version: number;
  reason?: string;
};
export type WorldState = {
  semantic_id: string;
  version: number;
  tick: number;
  cities: City[];
  memberships: Membership[];
  links: WorldLink[];
  shipments: Shipment[];
  results: Record<string, TradeResult>;
  events: { tick: number; kind: string; id: string; actorId?: string }[];
};
function path(state: WorldState, from: string, to: string): string[] {
  const queue = [[from]],
    seen = new Set([from]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (p.at(-1) === to) return p;
    for (const link of state.links
      .filter((l) => l.from === p.at(-1))
      .sort((a, b) => a.to.localeCompare(b.to, "en")))
      if (!seen.has(link.to)) {
        seen.add(link.to);
        queue.push([...p, link.to]);
      }
  }
  return [];
}
export function createWorld(
  cities: City[],
  memberships: Membership[],
  links: WorldLink[],
): WorldState {
  const ids = new Set(cities.map((c) => c.id));
  if (
    ids.size !== cities.length ||
    cities.some(
      (c) =>
        !c.id ||
        !c.regionId ||
        !Number.isSafeInteger(c.capacity) ||
        c.capacity <= 0 ||
        count(c.inventory) > c.capacity ||
        !Object.values(c.inventory).every(
          (n) => Number.isSafeInteger(n) && n >= 0,
        ),
    ) ||
    links.some(
      (l) =>
        !ids.has(l.from) ||
        !ids.has(l.to) ||
        !Number.isSafeInteger(l.ticks) ||
        l.ticks <= 0,
    ) ||
    memberships.some(
      (m) =>
        !m.actorId ||
        !ids.has(m.cityId) ||
        !["member", "owner"].includes(m.role) ||
        cities.find((c) => c.id === m.cityId)?.regionId !== m.regionId,
    )
  )
    throw Error("RM9: invalid world contract");
  return {
    semantic_id: semanticId,
    version: 0,
    tick: 0,
    cities: structuredClone(cities),
    memberships: structuredClone(memberships),
    links: structuredClone(links),
    shipments: [],
    results: {},
    events: [],
  };
}
export function submit(
  previous: WorldState,
  principal: Principal,
  command: TradeCommand,
): { state: WorldState; result: TradeResult } {
  if (!authorize(principal, command.from, previous.memberships))
    return {
      state: structuredClone(previous),
      result: {
        id: command.id,
        accepted: false,
        version: previous.version,
        reason: "unauthorized",
      },
    };
  const resultKey = JSON.stringify([principal.id, command.id]);
  if (previous.results[resultKey])
    return {
      state: structuredClone(previous),
      result: { ...previous.results[resultKey] },
    };
  const state = structuredClone(previous);
  let reason = "";
  const from = state.cities.find((c) => c.id === command.from),
    to = state.cities.find((c) => c.id === command.to);
  const p = path(state, command.from, command.to);
  if (
    !command.id ||
    command.from === command.to ||
    !from ||
    !to ||
    !command.resource ||
    !Number.isSafeInteger(command.quantity) ||
    command.quantity <= 0
  )
    reason = "invalid-trade";
  else if (command.expectedVersion !== state.version) reason = "stale-version";
  else if (amount(from.inventory, command.resource) < command.quantity)
    reason = "insufficient-stock";
  else if (p.length < 2) reason = "disconnected";
  if (!reason) {
    add(from!.inventory, command.resource, -command.quantity);
    state.shipments.push({
      id: resultKey,
      from: command.from,
      to: command.to,
      resource: command.resource,
      quantity: command.quantity,
      path: p,
      edge: 0,
      remaining: state.links.find((l) => l.from === p[0] && l.to === p[1])!
        .ticks,
      status: "moving",
    });
  }
  state.version++;
  const result = {
    id: command.id,
    accepted: !reason,
    version: state.version,
    ...(reason ? { reason } : {}),
  };
  state.results[resultKey] = result;
  state.events.push({
    tick: state.tick,
    kind: reason ? "trade-rejected" : "trade-reserved",
    id: resultKey,
    actorId: principal.id,
  });
  return { state, result };
}
export function advanceWorld(previous: WorldState): WorldState {
  const state = structuredClone(previous);
  state.tick++;
  state.version++;
  for (const s of state.shipments) {
    if (s.status === "delivered") continue;
    if (s.status === "moving") {
      if (
        !state.links.some(
          (l) => l.from === s.path[s.edge] && l.to === s.path[s.edge + 1],
        )
      ) {
        s.status = "blocked";
        continue;
      }
      s.remaining--;
      if (s.remaining > 0) continue;
      s.edge++;
      if (s.edge < s.path.length - 1) {
        const l = state.links.find(
          (l) => l.from === s.path[s.edge] && l.to === s.path[s.edge + 1],
        );
        if (!l) {
          s.status = "blocked";
          continue;
        }
        s.remaining = l.ticks;
        continue;
      }
    }
    if (s.edge < s.path.length - 1) {
      const l = state.links.find(
        (l) => l.from === s.path[s.edge] && l.to === s.path[s.edge + 1],
      );
      if (l) {
        s.status = "moving";
        s.remaining = Math.max(1, s.remaining);
      }
      continue;
    }
    const target = state.cities.find((c) => c.id === s.to)!;
    if (count(target.inventory) + s.quantity > target.capacity) {
      s.status = "blocked";
      continue;
    }
    add(target.inventory, s.resource, s.quantity);
    s.status = "delivered";
    state.events.push({ tick: state.tick, kind: "trade-delivered", id: s.id });
  }
  return state;
}
export function restoreWorld(checkpoint: string): WorldState {
  const value = JSON.parse(checkpoint) as WorldState;
  if (
    value.semantic_id !== semanticId ||
    !Number.isSafeInteger(value.tick) ||
    value.tick < 0 ||
    !Number.isSafeInteger(value.version) ||
    value.version < 0
  )
    throw Error("RM9: invalid checkpoint");
  createWorld(value.cities, value.memberships, value.links);
  if (
    !Array.isArray(value.shipments) ||
    !value.results ||
    !Array.isArray(value.events)
  )
    throw Error("RM9: incomplete checkpoint");
  return structuredClone(value);
}
export async function checkpointWorld(state: WorldState) {
  return { state: structuredClone(state), hash: await hash(state) };
}
export async function verifyWorldCheckpoint(checkpoint: {
  state: WorldState;
  hash: string;
}): Promise<WorldState> {
  if ((await hash(checkpoint.state)) !== checkpoint.hash)
    throw Error("RM9: checkpoint hash mismatch");
  return restoreWorld(JSON.stringify(checkpoint.state));
}
