/** RM2 / AC3: conserved resources and delivered construction. */
import type { State, Stock, Store, Rules } from "./rules.ts";
export const semanticId = "RM2";
export function amount(s: Stock, r: string): number {
  return s[r] ?? 0;
}
export function add(s: Stock, r: string, n: number): void {
  if (!Number.isSafeInteger(n) || amount(s, r) + n < 0)
    throw Error("RM2: invalid resource mutation");
  s[r] = amount(s, r) + n;
}
export function count(s: Stock): number {
  return Object.values(s).reduce((a, b) => a + b, 0);
}
export function has(s: Stock, cost: Stock): boolean {
  return Object.entries(cost).every(([r, n]) => amount(s, r) >= n);
}
export function total(state: State): Stock {
  const out: Stock = {};
  const accumulate = (stock: Stock) => {
    for (const [r, n] of Object.entries(stock)) add(out, r, n);
  };
  for (const store of state.stores) {
    accumulate(store.inventory);
    accumulate(store.incorporated);
    if (store.work) accumulate(store.work.inputs);
  }
  for (const c of state.carriers) accumulate(c.cargo);
  return out;
}
export function checkConservation(state: State): boolean {
  const expected = { ...state.initialTotal };
  for (const e of state.events)
    if (e.kind === "recipe-completed") {
      for (const [r, n] of Object.entries(e.inputs as Stock))
        add(expected, r, -n);
      for (const [r, n] of Object.entries(e.outputs as Stock))
        add(expected, r, n);
    }
  const actual = total(state);
  return [...new Set([...Object.keys(expected), ...Object.keys(actual)])].every(
    (r) => amount(expected, r) === amount(actual, r),
  );
}
export function advanceEconomy(state: State, rules: Rules): void {
  for (const s of [...state.stores].sort((a, b) =>
    a.id.localeCompare(b.id, "en"),
  )) {
    if (s.kind === "site" && s.status === "awaiting_materials") {
      const b = rules.construction[s.construction!];
      if (!b) throw Error("RM2: unknown construction");
      if (has(s.inventory, b.materials)) {
        for (const [r, n] of Object.entries(b.materials)) {
          add(s.inventory, r, -n);
          add(s.incorporated, r, n);
        }
        s.status = "building";
        s.buildTicks = 0;
        state.events.push({
          semantic_id: semanticId,
          tick: state.tick,
          kind: "construction-funded",
          store: s.id,
        });
      }
    } else if (s.kind === "site" && s.status === "building") {
      s.buildTicks++;
      if (s.buildTicks >= rules.construction[s.construction!].ticks) {
        s.status = "operational";
        state.events.push({
          semantic_id: semanticId,
          tick: state.tick,
          kind: "construction-completed",
          store: s.id,
        });
      }
    }
    if (s.kind !== "producer") continue;
    if (s.work) {
      s.work.ticks++;
      const recipe = rules.recipes[s.work.recipe];
      if (
        s.work.ticks >= recipe.ticks &&
        count(s.inventory) + count(recipe.outputs) <= s.capacity
      ) {
        for (const [r, n] of Object.entries(recipe.outputs)) {
          add(s.inventory, r, n);
          add(state.produced, r, n);
        }
        state.events.push({
          semantic_id: semanticId,
          tick: state.tick,
          kind: "recipe-completed",
          store: s.id,
          inputs: { ...s.work.inputs },
          outputs: { ...recipe.outputs },
        });
        delete s.work;
      }
    } else {
      const recipe = rules.recipes[s.recipe!];
      if (!recipe) throw Error("RM2: unknown recipe");
      if (has(s.inventory, recipe.inputs)) {
        for (const [r, n] of Object.entries(recipe.inputs))
          add(s.inventory, r, -n);
        s.work = { recipe: s.recipe!, ticks: 0, inputs: { ...recipe.inputs } };
      }
    }
  }
}
export function deliver(store: Store, resource: string, n: number): boolean {
  if (
    !Number.isSafeInteger(n) ||
    n <= 0 ||
    count(store.inventory) + n > store.capacity
  )
    return false;
  add(store.inventory, resource, n);
  return true;
}
