/** RM7 / ACA: configured food demand and explicit regeneration accounting. */
export const semanticId = "RM7";
export type Ecology = {
  food: number;
  population: number;
  forest: number;
  tick: number;
  status: "sustained" | "starving";
  events: { tick: number; kind: string; quantity: number }[];
};
export type EcologyRules = {
  foodPerPerson: number;
  regrowth: number;
  forestCapacity: number;
  harvestLimit: number;
};
export function advanceEcology(
  previous: Ecology,
  rules: EcologyRules,
  harvest: number,
): Ecology {
  if (
    ![
      previous.food,
      previous.population,
      previous.forest,
      previous.tick,
      rules.foodPerPerson,
      rules.regrowth,
      rules.forestCapacity,
      rules.harvestLimit,
      harvest,
    ].every((n) => Number.isSafeInteger(n) && n >= 0) ||
    previous.forest > rules.forestCapacity ||
    harvest > rules.harvestLimit ||
    harvest > previous.forest
  )
    throw Error("RM7: invalid ecology or harvest");
  const next = structuredClone(previous);
  next.tick++;
  const need = next.population * rules.foodPerPerson;
  const eaten = Math.min(next.food, need);
  next.food -= eaten;
  next.status = eaten === need ? "sustained" : "starving";
  next.forest -= harvest;
  const grown = Math.min(rules.regrowth, rules.forestCapacity - next.forest);
  next.forest += grown;
  next.events.push(
    { tick: next.tick, kind: "food-consumed", quantity: eaten },
    { tick: next.tick, kind: "forest-harvested", quantity: harvest },
    { tick: next.tick, kind: "forest-regenerated", quantity: grown },
  );
  return next;
}
