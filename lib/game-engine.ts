export type Point = { x: number; y: number };

export interface Entity {
  id: string;
  pos: Point;
  type: 'tree' | 'base' | 'worker' | 'building' | 'road';
}

export interface Tree extends Entity {
  type: 'tree';
  wood: number;
}

export interface Base extends Entity {
  type: 'base';
  width: number;
  height: number;
}

export interface Building extends Entity {
  type: 'building';
  width: number;
  height: number;
}

export interface Worker extends Entity {
  type: 'worker';
  state: 'to_tree' | 'harvesting' | 'to_base' | 'to_home' | 'idle';
  targetTreeId: string | null;
  homeBuildingId: string;
  carrying: boolean;
  speed: number;
  harvestTimer: number;
}

export interface LogEntry {
  text: string;
  timestamp: string;
}

export const GRID_SIZE = 40;
export const HARVEST_TIME = 2;
export const LUMBERJACK_RADIUS = 220;
export const SPEED_OFFROAD = 20;
export const SPEED_ROAD = 100;

export interface GameState {
  money: number;
  wood: number;
  trees: Tree[];
  base: Base;
  workers: Worker[];
  buildings: Building[];
  roads: Record<string, boolean>; // Key: "gx,gy"
  missionComplete: boolean;
  logs: LogEntry[];
}

export const INITIAL_STATE: GameState = {
  money: 100,
  wood: 0,
  trees: [
    { id: 'tree-1', pos: { x: 180, y: 150 }, type: 'tree', wood: 5 },
    { id: 'tree-2', pos: { x: 220, y: 200 }, type: 'tree', wood: 5 },
    { id: 'tree-3', pos: { x: 160, y: 250 }, type: 'tree', wood: 5 },
    { id: 'tree-4', pos: { x: 120, y: 180 }, type: 'tree', wood: 5 },
    { id: 'tree-5', pos: { x: 250, y: 120 }, type: 'tree', wood: 5 },
  ],
  base: { id: 'base-1', pos: { x: 440, y: 280 }, width: 80, height: 80, type: 'base' },
  workers: [],
  buildings: [],
  roads: {},
  missionComplete: false,
  logs: [],
};

export function updateWorker(worker: Worker, state: GameState, dt: number): { worker: Worker; woodGained: number; log?: string } {
  let woodGained = 0;
  let log: string | undefined;
  const newWorker = { ...worker };

  const homeBuilding = state.buildings.find(b => b.id === newWorker.homeBuildingId);
  if (!homeBuilding) return { worker: newWorker, woodGained };

  // Speed check: direct position based
  const gx = Math.floor(newWorker.pos.x / GRID_SIZE);
  const gy = Math.floor(newWorker.pos.y / GRID_SIZE);
  const isOnRoad = state.roads[`${gx},${gy}`];
  const currentSpeed = isOnRoad ? SPEED_ROAD : SPEED_OFFROAD;

  // Search for tree if idle
  if (newWorker.state === 'idle') {
    let nearestTreeId = null;
    let minDist = Infinity;
    
    for (const tree of state.trees) {
      if (tree.wood <= 0) continue;
      
      const distToHome = Math.sqrt(Math.pow(tree.pos.x - (homeBuilding.pos.x + homeBuilding.width/2), 2) + Math.pow(tree.pos.y - (homeBuilding.pos.y + homeBuilding.height/2), 2));
      if (distToHome <= LUMBERJACK_RADIUS) {
        const distToWorker = Math.sqrt(Math.pow(tree.pos.x - newWorker.pos.x, 2) + Math.pow(tree.pos.y - newWorker.pos.y, 2));
        if (distToWorker < minDist) {
          minDist = distToWorker;
          nearestTreeId = tree.id;
        }
      }
    }

    if (nearestTreeId) {
      newWorker.targetTreeId = nearestTreeId;
      newWorker.state = 'to_tree';
    }
  }

  if (newWorker.state === 'to_tree') {
    const tree = state.trees.find(t => t.id === newWorker.targetTreeId);
    if (!tree || tree.wood <= 0) {
      newWorker.targetTreeId = null;
      newWorker.state = 'idle';
    } else {
      const arrived = moveToward(newWorker.pos, tree.pos, dt, currentSpeed);
      if (arrived) {
        newWorker.state = 'harvesting';
        newWorker.harvestTimer = 0;
      }
    }
  } else if (newWorker.state === 'harvesting') {
    newWorker.harvestTimer += dt;
    if (newWorker.harvestTimer >= HARVEST_TIME) {
      const tree = state.trees.find(t => t.id === newWorker.targetTreeId);
      if (tree && tree.wood > 0) {
        tree.wood -= 1;
        newWorker.carrying = true;
        newWorker.state = 'to_base';
        log = `[worker] resource harvested. tree wood: ${tree.wood}`;
      } else {
        newWorker.targetTreeId = null;
        newWorker.state = 'idle';
      }
    }
  } else if (newWorker.state === 'to_base') {
    const target = { x: state.base.pos.x + state.base.width / 2, y: state.base.pos.y + state.base.height / 2 };
    const arrived = moveToward(newWorker.pos, target, dt, currentSpeed);
    if (arrived) {
      woodGained = 1;
      newWorker.carrying = false;
      newWorker.state = 'to_home';
    }
  } else if (newWorker.state === 'to_home') {
    const target = { x: homeBuilding.pos.x + homeBuilding.width / 2, y: homeBuilding.pos.y + homeBuilding.height / 2 };
    const arrived = moveToward(newWorker.pos, target, dt, currentSpeed);
    if (arrived) {
      newWorker.state = 'idle';
    }
  }

  return { worker: newWorker, woodGained, log };
}

function moveToward(pos: Point, target: Point, dt: number, speed: number): boolean {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 2) {
    return true;
  }

  const vx = (dx / distance) * speed * dt;
  const vy = (dy / distance) * speed * dt;

  pos.x += vx;
  pos.y += vy;

  return false;
}
