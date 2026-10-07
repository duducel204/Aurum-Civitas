export type Point = { x: number; y: number };

export type EntityType = 'tree' | 'base' | 'worker' | 'building' | 'road';
export type BuildingRole = 'lumberjack' | 'sawmill';
export type WorkerState = 'idle' | 'to_tree' | 'harvesting' | 'to_delivery' | 'to_home';

export interface Entity {
  id: string;
  pos: Point;
  type: EntityType;
}

export interface Tree extends Entity {
  type: 'tree';
  wood: number;
}

export interface Base extends Entity {
  type: 'base';
  width: number;
  height: number;
  inventory: {
    wood: number;
    planks: number;
  };
}

export interface Building extends Entity {
  type: 'building';
  role: BuildingRole;
  width: number;
  height: number;
  inputWood: number;
  outputPlanks: number;
  processingTimer: number;
  constructionTimer: number;
  status: 'constructing' | 'operational' | 'processing';
}

export interface Worker extends Entity {
  type: 'worker';
  state: WorkerState;
  targetTreeId: string | null;
  homeBuildingId: string;
  carrying: boolean;
  resource: 'wood' | null;
  harvestTimer: number;
}

export interface LogEntry {
  text: string;
  timestamp: string;
}

export const GRID_SIZE = 40;
export const HARVEST_TIME = 2;
export const BUILD_TIME = 3;
export const SAWMILL_TIME = 3;
export const LUMBERJACK_RADIUS = 220;
export const SPEED_OFFROAD = 20;
export const SPEED_ROAD = 100;
export const MISSION_PLANKS = 10;

export const BUILDING_DEFINITIONS: Record<BuildingRole, {
  label: string;
  cost: number;
  width: number;
  height: number;
}> = {
  lumberjack: { label: 'Lumberjack', cost: 50, width: 60, height: 60 },
  sawmill: { label: 'Sawmill', cost: 70, width: 60, height: 60 },
};

export interface GameMetrics {
  startTime: number | null;
  endTime: number | null;
  woodHarvested: number;
  planksProduced: number;
  moneySpent: number;
  roadsBuilt: number;
  treesDepleted: number;
  lumberjacksBuilt: number;
  sawmillsBuilt: number;
}

export interface GameState {
  money: number;
  trees: Tree[];
  base: Base;
  workers: Worker[];
  buildings: Building[];
  roads: Record<string, boolean>;
  missionComplete: boolean;
  logs: LogEntry[];
  metrics: GameMetrics;
  nextEntityId: number;
}

export const INITIAL_STATE: GameState = {
  money: 160,
  trees: [
    { id: 'tree-1', pos: { x: 180, y: 150 }, type: 'tree', wood: 5 },
    { id: 'tree-2', pos: { x: 220, y: 200 }, type: 'tree', wood: 5 },
    { id: 'tree-3', pos: { x: 160, y: 250 }, type: 'tree', wood: 5 },
    { id: 'tree-4', pos: { x: 120, y: 180 }, type: 'tree', wood: 5 },
    { id: 'tree-5', pos: { x: 250, y: 120 }, type: 'tree', wood: 5 },
  ],
  base: {
    id: 'base-1',
    pos: { x: 440, y: 280 },
    width: 80,
    height: 80,
    type: 'base',
    inventory: { wood: 0, planks: 0 },
  },
  workers: [],
  buildings: [],
  roads: {},
  missionComplete: false,
  logs: [],
  metrics: {
    startTime: null,
    endTime: null,
    woodHarvested: 0,
    planksProduced: 0,
    moneySpent: 0,
    roadsBuilt: 0,
    treesDepleted: 0,
    lumberjacksBuilt: 0,
    sawmillsBuilt: 0,
  },
  nextEntityId: 1,
};

export function createInitialState(): GameState {
  return JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;
}

export function nextId(state: GameState, prefix: string): string {
  return `${prefix}-${state.nextEntityId}`;
}

export function createBuilding(role: BuildingRole, x: number, y: number, id: string): Building {
  const def = BUILDING_DEFINITIONS[role];
  return {
    id,
    type: 'building',
    role,
    pos: {
      x: Math.floor(x / GRID_SIZE) * GRID_SIZE,
      y: Math.floor(y / GRID_SIZE) * GRID_SIZE,
    },
    width: def.width,
    height: def.height,
    inputWood: 0,
    outputPlanks: 0,
    processingTimer: 0,
    constructionTimer: 0,
    status: 'constructing',
  };
}

export function createLumberjackWorker(building: Building, id: string): Worker {
  return {
    id,
    type: 'worker',
    pos: {
      x: building.pos.x + building.width / 2,
      y: building.pos.y + building.height / 2,
    },
    state: 'idle',
    targetTreeId: null,
    homeBuildingId: building.id,
    carrying: false,
    resource: null,
    harvestTimer: 0,
  };
}

export function updateBuilding(
  building: Building,
  dt: number
): { building: Building; becameOperational: boolean; plankProduced: boolean } {
  let plankProduced = false;
  let becameOperational = false;
  const next = { ...building };

  if (next.status === 'constructing') {
    next.constructionTimer += dt;
    if (next.constructionTimer >= BUILD_TIME) {
      next.status = 'operational';
      becameOperational = true;
    }
    return { building: next, becameOperational, plankProduced };
  }

  if (next.role === 'sawmill') {
    if (next.status === 'processing') {
      next.processingTimer += dt;
      if (next.processingTimer >= SAWMILL_TIME) {
        next.outputPlanks += 1;
        next.processingTimer = 0;
        next.status = 'operational';
        plankProduced = true;
      }
    } else if (next.inputWood > 0) {
      next.inputWood -= 1;
      next.status = 'processing';
      next.processingTimer = 0;
    }
  }

  return { building: next, becameOperational, plankProduced };
}

export function updateWorker(
  worker: Worker,
  state: GameState,
  dt: number
): {
  worker: Worker;
  harvestedTreeId?: string;
  woodDelivered: boolean;
  targetBuildingId?: string;
  log?: string;
} {
  let woodDelivered = false;
  let targetBuildingId: string | undefined;
  let log: string | undefined;
  const next: Worker = { ...worker, pos: { ...worker.pos } };

  const home = state.buildings.find(b => b.id === next.homeBuildingId);
  if (!home || home.status === 'constructing') {
    next.state = 'idle';
    return { worker: next, woodDelivered };
  }

  if (next.state === 'idle') {
    const tree = nearestEligibleTree(next.pos, home, state.trees);
    if (tree) {
      next.targetTreeId = tree.id;
      next.state = 'to_tree';
    }
    return { worker: next, woodDelivered };
  }

  if (next.state === 'to_tree') {
    const tree = state.trees.find(t => t.id === next.targetTreeId && t.wood > 0);
    if (!tree) {
      next.targetTreeId = null;
      next.state = 'idle';
      return { worker: next, woodDelivered };
    }

    if (moveUsingRoads(next.pos, tree.pos, state, dt)) {
      next.state = 'harvesting';
      next.harvestTimer = 0;
    }
    return { worker: next, woodDelivered };
  }

  if (next.state === 'harvesting') {
    const tree = state.trees.find(t => t.id === next.targetTreeId && t.wood > 0);
    if (!tree) {
      next.targetTreeId = null;
      next.harvestTimer = 0;
      next.state = 'idle';
      return { worker: next, woodDelivered };
    }

    next.harvestTimer += dt;
    if (next.harvestTimer >= HARVEST_TIME) {
      next.harvestTimer = 0;
      next.carrying = true;
      next.resource = 'wood';
      next.state = 'to_delivery';
      log = `[worker] harvested 1 wood from ${tree.id}`;
      return { worker: next, harvestedTreeId: tree.id, woodDelivered, log };
    }
    return { worker: next, woodDelivered };
  }

  if (next.state === 'to_delivery') {
    const delivery = chooseWoodDelivery(next.pos, state);
    if (moveUsingRoads(next.pos, delivery.pos, state, dt)) {
      woodDelivered = true;
      targetBuildingId = delivery.id;
      next.carrying = false;
      next.resource = null;
      next.targetTreeId = null;
      next.state = 'to_home';
      log = `[worker] wood delivered to ${delivery.id === state.base.id ? 'base' : delivery.id}`;
    }
    return { worker: next, woodDelivered, targetBuildingId, log };
  }

  if (next.state === 'to_home') {
    const target = {
      x: home.pos.x + home.width / 2,
      y: home.pos.y + home.height / 2,
    };
    if (moveUsingRoads(next.pos, target, state, dt)) next.state = 'idle';
  }

  return { worker: next, woodDelivered };
}

function nearestEligibleTree(origin: Point, home: Building, trees: Tree[]): Tree | undefined {
  const homeCenter = {
    x: home.pos.x + home.width / 2,
    y: home.pos.y + home.height / 2,
  };

  return trees
    .filter(tree => tree.wood > 0 && distance(homeCenter, tree.pos) <= LUMBERJACK_RADIUS)
    .sort((a, b) => distance(origin, a.pos) - distance(origin, b.pos))[0];
}

function chooseWoodDelivery(origin: Point, state: GameState): { id: string; pos: Point } {
  const sawmills = state.buildings
    .filter(b => b.role === 'sawmill' && b.status !== 'constructing' && b.inputWood < 3)
    .sort((a, b) => distance(origin, buildingCenter(a)) - distance(origin, buildingCenter(b)));

  if (sawmills[0]) {
    return { id: sawmills[0].id, pos: buildingCenter(sawmills[0]) };
  }

  return {
    id: state.base.id,
    pos: {
      x: state.base.pos.x + state.base.width / 2,
      y: state.base.pos.y + state.base.height / 2,
    },
  };
}

function buildingCenter(building: Building): Point {
  return {
    x: building.pos.x + building.width / 2,
    y: building.pos.y + building.height / 2,
  };
}

function roadCenter(key: string): Point {
  const [gx, gy] = key.split(',').map(Number);
  return {
    x: gx * GRID_SIZE + GRID_SIZE / 2,
    y: gy * GRID_SIZE + GRID_SIZE / 2,
  };
}

function roadNeighbors(key: string, roads: Record<string, boolean>): string[] {
  const [gx, gy] = key.split(',').map(Number);
  return [
    `${gx + 1},${gy}`,
    `${gx - 1},${gy}`,
    `${gx},${gy + 1}`,
    `${gx},${gy - 1}`,
  ].filter(next => roads[next]);
}

function nearestRoadKey(point: Point, roads: Record<string, boolean>): string | null {
  const keys = Object.keys(roads);
  if (keys.length === 0) return null;

  let best: string | null = null;
  let bestDistance = Infinity;

  for (const key of keys) {
    const d = distance(point, roadCenter(key));
    if (d < bestDistance) {
      bestDistance = d;
      best = key;
    }
  }
  return best;
}

function findRoadPath(
  startKey: string,
  endKey: string,
  roads: Record<string, boolean>
): string[] | null {
  if (startKey === endKey) return [startKey];

  const queue = [startKey];
  const previous = new Map<string, string | null>([[startKey, null]]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of roadNeighbors(current, roads)) {
      if (previous.has(next)) continue;
      previous.set(next, current);

      if (next === endKey) {
        const path: string[] = [];
        let cursor: string | null = next;
        while (cursor) {
          path.push(cursor);
          cursor = previous.get(cursor) ?? null;
        }
        return path.reverse();
      }

      queue.push(next);
    }
  }

  return null;
}

function moveUsingRoads(
  pos: Point,
  target: Point,
  state: GameState,
  dt: number
): boolean {
  const startRoad = nearestRoadKey(pos, state.roads);
  const endRoad = nearestRoadKey(target, state.roads);

  if (startRoad && endRoad) {
    const path = findRoadPath(startRoad, endRoad, state.roads);

    if (path && path.length > 0) {
      const startCenter = roadCenter(path[0]);

      if (distance(pos, startCenter) > 4) {
        return moveToward(pos, startCenter, dt, SPEED_OFFROAD);
      }

      for (const key of path.slice(1)) {
        const waypoint = roadCenter(key);
        if (distance(pos, waypoint) > 4) {
          return moveToward(pos, waypoint, dt, SPEED_ROAD);
        }
      }

      return moveToward(pos, target, dt, SPEED_OFFROAD);
    }
  }

  return moveToward(pos, target, dt, SPEED_OFFROAD);
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function moveToward(pos: Point, target: Point, dt: number, speed: number): boolean {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const distanceToTarget = Math.hypot(dx, dy);

  if (distanceToTarget < 2) return true;

  const step = Math.min(distanceToTarget, speed * dt);
  pos.x += (dx / distanceToTarget) * step;
  pos.y += (dy / distanceToTarget) * step;

  return distanceToTarget - step < 2;
}
