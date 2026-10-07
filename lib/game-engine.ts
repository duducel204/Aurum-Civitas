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
  inventory: {
    wood: number;
    planks: number;
  };
}

export interface Building extends Entity {
  type: 'building';
  role: 'lumberjack' | 'sawmill';
  width: number;
  height: number;
  inputWood: number;
  outputPlanks: number;
  processingTimer: number;
  status: 'operational' | 'processing';
}

export interface Worker extends Entity {
  type: 'worker';
  state: 'to_tree' | 'harvesting' | 'to_delivery' | 'to_home' | 'idle';
  targetTreeId: string | null;
  homeBuildingId: string;
  carrying: boolean;
  resource: 'wood' | null;
  speed: number;
  harvestTimer: number;
}

export interface LogEntry {
  text: string;
  timestamp: string;
}

export const GRID_SIZE = 40;
export const HARVEST_TIME = 2;
export const SAWMILL_TIME = 3;
export const LUMBERJACK_RADIUS = 220;
export const SPEED_OFFROAD = 20;
export const SPEED_ROAD = 100;

export interface GameMetrics {
  startTime: number | null;
  endTime: number | null;
  woodHarvested: number;
  planksProduced: number;
  moneySpent: number;
  roadsBuilt: number;
  treesDepleted: number;
}

export interface GameState {
  money: number;
  wood: number; // For UI display of base stock
  planks: number; // For UI display of base stock
  trees: Tree[];
  base: Base;
  workers: Worker[];
  buildings: Building[];
  roads: Record<string, boolean>; // Key: "gx,gy"
  missionComplete: boolean;
  logs: LogEntry[];
  metrics: GameMetrics;
}

export const INITIAL_STATE: GameState = {
  money: 100,
  wood: 0,
  planks: 0,
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
    inventory: { wood: 0, planks: 0 }
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
  },
};

export function updateBuilding(building: Building, dt: number): { building: Building; plankProduced: boolean } {
  let plankProduced = false;
  const newBuilding = { ...building };

  if (newBuilding.role === 'sawmill') {
    if (newBuilding.status === 'processing') {
      newBuilding.processingTimer += dt;
      if (newBuilding.processingTimer >= SAWMILL_TIME) {
        newBuilding.outputPlanks += 1;
        newBuilding.processingTimer = 0;
        newBuilding.status = 'operational';
        plankProduced = true;
      }
    } else if (newBuilding.inputWood > 0) {
      newBuilding.inputWood -= 1;
      newBuilding.status = 'processing';
      newBuilding.processingTimer = 0;
    }
  }

  return { building: newBuilding, plankProduced };
}

export function updateWorker(worker: Worker, state: GameState, dt: number): { 
  worker: Worker; 
  woodHarvested: boolean;
  woodDelivered: boolean; 
  targetBuildingId?: string; 
  log?: string 
} {
  let woodHarvested = false;
  let woodDelivered = false;
  let targetBuildingId: string | undefined;
  let log: string | undefined;
  const newWorker = { ...worker };

  const homeBuilding = state.buildings.find(b => b.id === newWorker.homeBuildingId);
  if (!homeBuilding) return { worker: newWorker, woodHarvested, woodDelivered };

  const gx = Math.floor(newWorker.pos.x / GRID_SIZE);
  const gy = Math.floor(newWorker.pos.y / GRID_SIZE);
  const isOnRoad = state.roads[`${gx},${gy}`];
  const currentSpeed = isOnRoad ? SPEED_ROAD : SPEED_OFFROAD;

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
        woodHarvested = true;
        newWorker.carrying = true;
        newWorker.resource = 'wood';
        newWorker.state = 'to_delivery';
        log = `[worker] wood harvested (${tree.wood} left)`;
      } else {
        newWorker.targetTreeId = null;
        newWorker.state = 'idle';
      }
    }
  } else if (newWorker.state === 'to_delivery') {
    // Choose delivery point: Sawmill needing wood > Base
    const sawmills = state.buildings.filter(b => b.role === 'sawmill' && b.inputWood < 3);
    let targetPos: Point;
    let targetId: string;

    if (sawmills.length > 0) {
      // Pick nearest sawmill
      const nearestSawmill = sawmills.reduce((prev, curr) => {
        const distPrev = Math.sqrt(Math.pow(prev.pos.x - newWorker.pos.x, 2) + Math.pow(prev.pos.y - newWorker.pos.y, 2));
        const distCurr = Math.sqrt(Math.pow(curr.pos.x - newWorker.pos.x, 2) + Math.pow(curr.pos.y - newWorker.pos.y, 2));
        return distPrev < distCurr ? prev : curr;
      });
      targetPos = { x: nearestSawmill.pos.x + nearestSawmill.width/2, y: nearestSawmill.pos.y + nearestSawmill.height/2 };
      targetId = nearestSawmill.id;
    } else {
      targetPos = { x: state.base.pos.x + state.base.width / 2, y: state.base.pos.y + state.base.height / 2 };
      targetId = state.base.id;
    }

    const arrived = moveToward(newWorker.pos, targetPos, dt, currentSpeed);
    if (arrived) {
      woodDelivered = true;
      targetBuildingId = targetId;
      newWorker.carrying = false;
      newWorker.resource = null;
      newWorker.state = 'to_home';
      log = `[worker] wood delivered to ${targetId === state.base.id ? 'Base' : 'Sawmill'}`;
    }
  } else if (newWorker.state === 'to_home') {
    const target = { x: homeBuilding.pos.x + homeBuilding.width / 2, y: homeBuilding.pos.y + homeBuilding.height / 2 };
    const arrived = moveToward(newWorker.pos, target, dt, currentSpeed);
    if (arrived) {
      newWorker.state = 'idle';
    }
  }

  return { worker: newWorker, woodHarvested, woodDelivered, targetBuildingId, log };
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
