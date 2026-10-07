export type Point = { x: number; y: number };

export interface Entity {
  id: string;
  pos: Point;
  type: 'tree' | 'base' | 'worker' | 'building' | 'road';
}

export interface Tree extends Entity {
  type: 'tree';
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
  state: 'to_tree' | 'to_base';
  targetTreeId: string | null;
  carrying: boolean;
  speed: number;
}

export interface Road extends Entity {
  type: 'road';
  width: number;
  height: number;
}

export interface LogEntry {
  text: string;
  timestamp: string;
}

export interface GameState {
  money: number;
  wood: number;
  trees: Tree[];
  base: Base;
  workers: Worker[];
  buildings: Building[];
  roads: Road[];
  missionComplete: boolean;
  logs: LogEntry[];
}

export const INITIAL_STATE: GameState = {
  money: 100,
  wood: 0,
  trees: [
    { id: 'tree-1', pos: { x: 180, y: 150 }, type: 'tree' },
    { id: 'tree-2', pos: { x: 220, y: 200 }, type: 'tree' },
    { id: 'tree-3', pos: { x: 160, y: 250 }, type: 'tree' },
  ],
  base: { id: 'base-1', pos: { x: 450, y: 300 }, width: 100, height: 100, type: 'base' },
  workers: [],
  buildings: [],
  roads: [],
  missionComplete: false,
  logs: [],
};

export function updateWorker(worker: Worker, state: GameState, dt: number): { worker: Worker; woodGained: number; log?: string } {
  let woodGained = 0;
  let log: string | undefined;
  const newWorker = { ...worker };

  // Speed logic: 100% on roads or near targets, 10% otherwise (simulating "must use roads")
  const isOnRoad = state.roads.some(r => 
    newWorker.pos.x >= r.pos.x && newWorker.pos.x <= r.pos.x + r.width &&
    newWorker.pos.y >= r.pos.y && newWorker.pos.y <= r.pos.y + r.height
  );
  
  // Also consider being "at" the base or "at" a tree as "on road" for loading/unloading
  const isAtBase = Math.abs(newWorker.pos.x - (state.base.pos.x + state.base.width/2)) < 60 && 
                   Math.abs(newWorker.pos.y - (state.base.pos.y + state.base.height/2)) < 60;

  const currentSpeed = (isOnRoad || isAtBase) ? newWorker.speed : newWorker.speed * 0.15;

  if (newWorker.state === 'to_tree') {
    if (!newWorker.targetTreeId && state.trees.length > 0) {
      // Find nearest tree
      let minDist = Infinity;
      let nearestTreeId = null;
      for (const tree of state.trees) {
        const dist = Math.sqrt(Math.pow(tree.pos.x - newWorker.pos.x, 2) + Math.pow(tree.pos.y - newWorker.pos.y, 2));
        if (dist < minDist) {
          minDist = dist;
          nearestTreeId = tree.id;
        }
      }
      newWorker.targetTreeId = nearestTreeId;
    }

    if (newWorker.targetTreeId) {
      const targetTree = state.trees.find(t => t.id === newWorker.targetTreeId);
      if (targetTree) {
        const arrived = moveToward(newWorker, targetTree.pos, dt, currentSpeed);
        if (arrived) {
          newWorker.carrying = true;
          newWorker.state = 'to_base';
          log = `[worker] resource harvested from ${newWorker.targetTreeId}`;
        }
      } else {
        newWorker.targetTreeId = null;
      }
    }
  } else if (newWorker.state === 'to_base') {
    const target = {
      x: state.base.pos.x + state.base.width / 2,
      y: state.base.pos.y + state.base.height / 2,
    };

    const arrived = moveToward(newWorker, target, dt, currentSpeed);
    if (arrived) {
      woodGained = 1;
      newWorker.carrying = false;
      newWorker.targetTreeId = null;
      newWorker.state = 'to_tree';
      log = `[base] resource deposited. +1 wood`;
    }
  }

  return { worker: newWorker, woodGained, log };
}

function moveToward(entity: Worker, target: Point, dt: number, speed: number): boolean {
  const dx = target.x - entity.pos.x;
  const dy = target.y - entity.pos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 4) {
    return true;
  }

  const vx = (dx / distance) * speed * dt;
  const vy = (dy / distance) * speed * dt;

  entity.pos.x += vx;
  entity.pos.y += vy;

  return false;
}
