/** RM1 / AC2: the sole canonical fixed-tick transition, shared by UI and replay. */
import { validateRules } from "./rules.ts";
import type { State, Rules, Command, Store, Carrier, Stock } from "./rules.ts";
import {
  total,
  advanceEconomy,
  amount,
  checkConservation,
  count,
} from "./economy.ts";
import { advanceTransport } from "./transport.ts";
export const semanticId = "RM1";
export function createState(
  rules: Rules,
  stores: Store[],
  carriers: Carrier[],
): State {
  validateRules(rules);
  const state: State = {
    tick: 0,
    version: 0,
    rulesVersion: rules.version,
    stores: structuredClone(stores),
    carriers: structuredClone(carriers),
    roads: {},
    roadVersion: 0,
    produced: {},
    incorporated: {},
    bootstrap: {},
    events: [],
    commandIds: [],
    initialTotal: {},
    completed: false,
  };
  const ids = [...stores, ...carriers].map((s) => s.id);
  if (new Set(ids).size !== ids.length) throw Error("RM1: duplicate entity ID");
  for (const s of stores) {
    if (
      !s.id ||
      !Number.isFinite(s.pos.x) ||
      !Number.isFinite(s.pos.y) ||
      !Number.isSafeInteger(s.capacity) ||
      s.capacity <= 0 ||
      count(s.inventory) > s.capacity ||
      !Object.values(s.inventory).every(
        (n) => Number.isSafeInteger(n) && n >= 0,
      ) ||
      Object.keys(s.incorporated).length ||
      s.work
    )
      throw Error("RM1: invalid initial store");
    if (s.kind === "producer" && !rules.recipes[s.recipe!])
      throw Error("RM1: unknown recipe");
    if (s.kind === "site" && !rules.construction[s.construction!])
      throw Error("RM1: unknown construction");
  }
  for (const c of carriers)
    if (
      count(c.cargo) ||
      !Number.isFinite(c.pos.x) ||
      !Number.isFinite(c.pos.y) ||
      c.job ||
      c.route.length ||
      c.phase !== "idle"
    )
      throw Error("RM1: initial carrier must be empty and idle");
  state.initialTotal = total(state);
  state.bootstrap = { ...state.initialTotal };
  return state;
}
export function step(
  previous: State,
  commands: Command[],
  rules: Rules,
): State {
  if (previous.rulesVersion !== rules.version)
    throw Error("RM1: incompatible rules version");
  validateRules(rules);
  const state = structuredClone(previous);
  state.tick++;
  state.version++;
  // Incoming command order is authoritative; IDs disambiguate retries, not reorder intent.
  for (const command of commands) {
    let reason = "";
    if (!command.id || state.commandIds.includes(command.id))
      reason = "duplicate-or-empty-id";
    else if (!Number.isFinite(command.x) || !Number.isFinite(command.y))
      reason = "invalid-position";
    else if (command.kind === "road") {
      const key = `${Math.floor(command.x / rules.gridSize)},${Math.floor(command.y / rules.gridSize)}`;
      if (state.roads[key]) reason = "existing-road";
      else {
        state.roads[key] = true;
        state.roadVersion++;
      }
    } else if (command.kind === "build") {
      if (!command.role || !rules.construction[command.role])
        reason = "unknown-construction";
      else {
        const id = "site:" + command.id;
        state.stores.push({
          id,
          pos: { x: command.x, y: command.y },
          kind: "site",
          inventory: {},
          incorporated: {},
          capacity: Math.max(
            rules.capacity,
            count(rules.construction[command.role].materials),
          ),
          construction: command.role,
          buildTicks: 0,
          status: "awaiting_materials",
        });
      }
    } else reason = "unknown-command";
    if (command.id && !state.commandIds.includes(command.id))
      state.commandIds.push(command.id);
    state.events.push({
      semantic_id: semanticId,
      tick: state.tick,
      kind: reason ? "command-rejected" : "command-accepted",
      commandId: command.id,
      reason,
    });
  }
  advanceEconomy(state, rules);
  advanceTransport(state, rules);
  state.completed =
    state.stores
      .filter((s) => s.kind === "depot")
      .reduce((n, s) => n + amount(s.inventory, rules.mission.resource), 0) >=
    rules.mission.delivered;
  if (!checkConservation(state)) throw Error("RM2: conservation violation");
  return state;
}
export function run(
  state: State,
  rules: Rules,
  ticks: number,
  commands: Record<number, Command[]> = {},
): State {
  if (!Number.isSafeInteger(ticks) || ticks < 0)
    throw Error("RM1: invalid horizon");
  let next = state;
  for (let i = 0; i < ticks; i++)
    next = step(next, commands[next.tick + 1] ?? [], rules);
  return next;
}
