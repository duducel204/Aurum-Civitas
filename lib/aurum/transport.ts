/** RM3 / AC4: persistent road waypoints, bounded physical delivery. */
import type { Point, State, Rules, Store, Carrier } from "./rules.ts";
import { amount, add, count, deliver } from "./economy.ts";
export const semanticId = "RM3";
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function route(
  origin: Point,
  target: Point,
  state: State,
  rules: Rules,
): Carrier["route"] {
  const keys = Object.keys(state.roads)
    .filter((k) => state.roads[k])
    .sort();
  const center = (k: string) => {
    const [x, y] = k.split(",").map(Number);
    return {
      x: x * rules.gridSize + rules.gridSize / 2,
      y: y * rules.gridSize + rules.gridSize / 2,
    };
  };
  const nearest = (p: Point) =>
    [...keys].sort(
      (a, b) =>
        distance(p, center(a)) - distance(p, center(b)) ||
        a.localeCompare(b, "en"),
    )[0];
  if (keys.length) {
    const start = nearest(origin),
      end = nearest(target);
    const queue = [start];
    const previous = new Map<string, string | null>([[start, null]]);
    for (let i = 0; i < queue.length && !previous.has(end); i++) {
      const k = queue[i];
      const [x, y] = k.split(",").map(Number);
      for (const n of [
        `${x - 1},${y}`,
        `${x},${y - 1}`,
        `${x},${y + 1}`,
        `${x + 1},${y}`,
      ])
        if (state.roads[n] && !previous.has(n)) {
          previous.set(n, k);
          queue.push(n);
        }
    }
    if (previous.has(end)) {
      const path = [];
      let cur: string | null = end;
      while (cur) {
        path.push(cur);
        cur = previous.get(cur) ?? null;
      }
      path.reverse();
      const points = path.map((k, i) => ({ point: center(k), road: i > 0 }));
      if (
        rules.allowOffroad ||
        (distance(origin, center(start)) === 0 &&
          distance(target, center(end)) === 0)
      )
        return [...points, { point: { ...target }, road: false }];
    }
  }
  return rules.allowOffroad ? [{ point: { ...target }, road: false }] : [];
}
function setTarget(c: Carrier, s: Store, state: State, rules: Rules) {
  c.target = s.id;
  c.route = route(c.pos, s.pos, state, rules);
  c.waypoint = 0;
  c.roadVersion = state.roadVersion;
}
function move(c: Carrier, rules: Rules): boolean {
  // Spend the remaining fraction of ONE tick across waypoints, preserving speed.
  let seconds = rules.tickMs / 1000;
  while (c.waypoint < c.route.length) {
    const w = c.route[c.waypoint];
    const d = distance(c.pos, w.point);
    const speed = w.road ? rules.roadSpeed : rules.offroadSpeed;
    if (d === 0) {
      c.waypoint++;
      continue;
    }
    const travel = Math.min(d, speed * seconds);
    c.pos.x += ((w.point.x - c.pos.x) * travel) / d;
    c.pos.y += ((w.point.y - c.pos.y) * travel) / d;
    seconds -= travel / speed;
    if (travel === d) {
      c.pos = { ...w.point };
      c.waypoint++;
    } else break;
    if (seconds <= 0) break;
  }
  return c.waypoint >= c.route.length;
}
function task(
  state: State,
  rules: Rules,
): { source: Store; target: Store; resource: string } | undefined {
  const stores = [...state.stores].sort((a, b) =>
    a.id.localeCompare(b.id, "en"),
  );
  for (const source of stores) {
    for (const [resource, n] of Object.entries(source.inventory).sort()) {
      if (n <= 0) continue;
      // Reserve destination slots for jobs already assigned; producer output in
      // progress also owns a slot. This avoids all carriers waiting at a full mill.
      const targets = stores.filter((t) => {
        const inbound = state.carriers.filter(
          (c) => c.job?.destination === t.id,
        ).length;
        const output = t.work ? count(rules.recipes[t.work.recipe].outputs) : 0;
        return (
          t.id !== source.id &&
          count(t.inventory) + inbound + output < t.capacity
        );
      });
      const site = targets.find(
        (t) =>
          t.kind === "site" &&
          t.status === "awaiting_materials" &&
          amount(t.inventory, resource) <
            amount(
              rules.construction[t.construction!]?.materials ?? {},
              resource,
            ),
      );
      if (site && source.kind === "depot")
        return { source, target: site, resource };
      const producer = targets.find(
        (t) =>
          t.kind === "producer" &&
          amount(rules.recipes[t.recipe!]?.inputs ?? {}, resource) > 0,
      );
      if (producer && (source.kind === "source" || source.kind === "depot"))
        return { source, target: producer, resource };
      const depot = targets.find((t) => t.kind === "depot");
      if (
        depot &&
        source.kind === "producer" &&
        amount(rules.recipes[source.recipe!]?.outputs ?? {}, resource) > 0
      )
        return { source, target: depot, resource };
    }
  }
  return undefined;
}
export function advanceTransport(state: State, rules: Rules): void {
  // Costs stay in rules: transient task planning must not add hidden canonical fields.
  for (const c of [...state.carriers].sort((a, b) =>
    a.id.localeCompare(b.id, "en"),
  )) {
    if (c.phase === "idle") {
      const t = task(state, rules);
      if (!t) continue;
      c.source = t.source.id;
      c.cargo = {};
      c.harvest = 0;
      c.phase = "pickup";
      // Resource and destination are persistent job fields, separate from cargo.
      (c as Carrier & { job?: { resource: string; destination: string } }).job =
        { resource: t.resource, destination: t.target.id };
      setTarget(c, t.source, state, rules);
    }
    const job = (
      c as Carrier & { job?: { resource: string; destination: string } }
    ).job;
    if (!job) continue;
    let target = state.stores.find((s) => s.id === c.target);
    if (!target) {
      c.phase = "blocked";
      continue;
    }
    if (c.roadVersion !== state.roadVersion || c.phase === "blocked")
      setTarget(c, target, state, rules);
    if (!c.route.length) {
      c.phase = "blocked";
      continue;
    }
    if (!move(c, rules)) continue;
    if (!count(c.cargo)) {
      const source = state.stores.find((s) => s.id === c.source)!;
      if (source.kind === "source") {
        c.phase = "harvesting";
        c.harvest++;
        if (c.harvest < rules.harvestTicks) continue;
      }
      if (amount(source.inventory, job.resource) <= 0) {
        c.phase = "idle";
        delete (c as Carrier & { job?: unknown }).job;
        continue;
      }
      add(source.inventory, job.resource, -1);
      add(c.cargo, job.resource, 1);
      c.phase = "moving";
      const destination = state.stores.find((s) => s.id === job.destination)!;
      setTarget(c, destination, state, rules);
      state.events.push({
        semantic_id: semanticId,
        tick: state.tick,
        kind: "picked-up",
        carrier: c.id,
        source: source.id,
        resource: job.resource,
      });
    } else {
      if (!deliver(target, job.resource, amount(c.cargo, job.resource))) {
        c.phase = "blocked";
        continue;
      }
      state.events.push({
        semantic_id: semanticId,
        tick: state.tick,
        kind: "delivered",
        carrier: c.id,
        target: target.id,
        resource: job.resource,
        quantity: amount(c.cargo, job.resource),
      });
      c.cargo = {};
      c.phase = "idle";
      c.target = null;
      c.source = null;
      c.route = [];
      delete (c as Carrier & { job?: unknown }).job;
    }
  }
}
