'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { INITIAL_STATE, GameState, updateWorker, updateBuilding, Worker, Building, GRID_SIZE, LUMBERJACK_RADIUS } from '@/lib/game-engine';

export default function GameWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const requestRef = useRef<number>(null);
  const previousTimeRef = useRef<number>(null);

  const createLog = useCallback((text: string) => {
    return {
      text,
      timestamp: new Date().toLocaleTimeString(),
    };
  }, []);

  // Initialize logs on mount to avoid hydration mismatch
  useEffect(() => {
    setGameState(prev => ({
      ...prev,
      logs: [
        createLog('[system] production simulation active.'),
        createLog('[mission] target: produce 10 planks.'),
      ],
    }));
  }, [createLog]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState.missionComplete) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (menuPos) {
      setMenuPos(null);
    } else {
      setMenuPos({ x, y });
    }
  };

  const buildLumberjack = (x: number, y: number) => {
    if (gameState.money >= 50) {
      const snappedX = Math.floor(x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.floor(y / GRID_SIZE) * GRID_SIZE;

      const newBuilding: Building = {
        id: `lumberjack-${Date.now()}`,
        type: 'building',
        role: 'lumberjack',
        pos: { x: snappedX, y: snappedY },
        width: 60,
        height: 60,
        inputWood: 0,
        outputPlanks: 0,
        processingTimer: 0,
        status: 'operational',
      };

      const newWorker: Worker = {
        id: `worker-${newBuilding.id}`,
        type: 'worker',
        pos: { x: snappedX + 30, y: snappedY + 30 },
        state: 'idle',
        targetTreeId: null,
        homeBuildingId: newBuilding.id,
        carrying: false,
        resource: null,
        speed: 120, 
        harvestTimer: 0,
      };

      setGameState(prev => ({
        ...prev,
        money: prev.money - 50,
        buildings: [...prev.buildings, newBuilding],
        workers: [...prev.workers, newWorker],
        metrics: {
          ...prev.metrics,
          startTime: prev.metrics.startTime || Date.now(),
          moneySpent: prev.metrics.moneySpent + 50,
        },
        logs: [...prev.logs, createLog(`[system] lumberjack operational`)].slice(-10),
      }));
    }
    setMenuPos(null);
  };

  const buildSawmill = (x: number, y: number) => {
    if (gameState.money >= 70) {
      const snappedX = Math.floor(x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.floor(y / GRID_SIZE) * GRID_SIZE;

      const newBuilding: Building = {
        id: `sawmill-${Date.now()}`,
        type: 'building',
        role: 'sawmill',
        pos: { x: snappedX, y: snappedY },
        width: 60,
        height: 60,
        inputWood: 0,
        outputPlanks: 0,
        processingTimer: 0,
        status: 'operational',
      };

      setGameState(prev => ({
        ...prev,
        money: prev.money - 70,
        buildings: [...prev.buildings, newBuilding],
        metrics: {
          ...prev.metrics,
          startTime: prev.metrics.startTime || Date.now(),
          moneySpent: prev.metrics.moneySpent + 70,
        },
        logs: [...prev.logs, createLog(`[system] sawmill constructed`)].slice(-10),
      }));
    }
    setMenuPos(null);
  };

  const buildRoad = (x: number, y: number) => {
    if (gameState.money >= 5) {
      const gridX = Math.floor(x / GRID_SIZE);
      const gridY = Math.floor(y / GRID_SIZE);
      const key = `${gridX},${gridY}`;

      if (gameState.roads[key]) return;

      setGameState(prev => ({
        ...prev,
        money: prev.money - 5,
        roads: { ...prev.roads, [key]: true },
        metrics: {
          ...prev.metrics,
          roadsBuilt: prev.metrics.roadsBuilt + 1,
          moneySpent: prev.metrics.moneySpent + 5,
        },
        logs: [...prev.logs, createLog(`[system] road tile placed`)].slice(-10),
      }));
    }
    setMenuPos(null);
  };

  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== null) {
      const dt = (time - previousTimeRef.current) / 1000;

      setGameState(prev => {
        if (prev.missionComplete) return prev;

        let woodHarvestedCount = 0;
        let planksProducedCount = 0;
        let woodDeliveredToBase = 0;
        const newLogs: string[] = [];

        // 1. Update Buildings (Processing)
        const updatedBuildings = prev.buildings.map(b => {
          const { building, plankProduced } = updateBuilding(b, dt);
          if (plankProduced) planksProducedCount++;
          return building;
        });

        // 2. Update Workers (Movement & Delivery)
        const updatedWorkers = prev.workers.map(w => {
          const { worker, woodHarvested, woodDelivered, targetBuildingId, log } = updateWorker(w, { ...prev, buildings: updatedBuildings }, dt);
          
          if (woodHarvested) woodHarvestedCount++;
          
          if (woodDelivered && targetBuildingId) {
             if (targetBuildingId === prev.base.id) {
                woodDeliveredToBase++;
             } else {
                // Delivered to sawmill
                const b = updatedBuildings.find(building => building.id === targetBuildingId);
                if (b) b.inputWood += 1;
             }
          }
          if (log) newLogs.push(log);
          return worker;
        });

        // 3. Update Inventory
        const baseWood = prev.base.inventory.wood + woodDeliveredToBase;
        const basePlanks = prev.base.inventory.planks + planksProducedCount;

        // 4. Update Trees
        const initialTreeCount = prev.trees.length;
        const updatedTrees = prev.trees.filter(t => t.wood > 0);
        const treesDepletedThisFrame = initialTreeCount - updatedTrees.length;

        const missionComplete = basePlanks >= 10;
        
        const logEntries = newLogs.map(l => createLog(l));
        if (missionComplete && !prev.missionComplete) {
           logEntries.push(createLog('[mission] MISSION COMPLETE: 10 planks produced.'));
        }

        return {
          ...prev,
          buildings: updatedBuildings,
          workers: updatedWorkers,
          trees: updatedTrees,
          wood: baseWood,
          planks: basePlanks,
          base: {
            ...prev.base,
            inventory: { wood: baseWood, planks: basePlanks }
          },
          missionComplete,
          logs: [...prev.logs, ...logEntries].slice(-10),
          metrics: {
            ...prev.metrics,
            endTime: missionComplete ? Date.now() : null,
            woodHarvested: prev.metrics.woodHarvested + woodHarvestedCount,
            planksProduced: basePlanks,
            treesDepleted: prev.metrics.treesDepleted + treesDepletedThisFrame,
          }
        };
      });
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [createLog]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Roads
    ctx.fillStyle = '#f1f5f9';
    Object.keys(gameState.roads).forEach(key => {
      const [gx, gy] = key.split(',').map(Number);
      ctx.fillRect(gx * GRID_SIZE, gy * GRID_SIZE, GRID_SIZE, GRID_SIZE);
    });

    // Radius UI
    if (menuPos) {
       ctx.beginPath();
       ctx.arc(menuPos.x, menuPos.y, LUMBERJACK_RADIUS, 0, Math.PI * 2);
       ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
       ctx.setLineDash([5, 5]);
       ctx.stroke();
       ctx.setLineDash([]);
    }

    // Base
    const base = gameState.base;
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(base.pos.x, base.pos.y, base.width, base.height);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.strokeRect(base.pos.x, base.pos.y, base.width, base.height);
    ctx.fillStyle = 'black';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BASE', base.pos.x + base.width/2, base.pos.y + base.height/2 - 5);
    ctx.font = '9px monospace';
    ctx.fillText(`W:${gameState.base.inventory.wood} P:${gameState.base.inventory.planks}`, base.pos.x + base.width/2, base.pos.y + base.height/2 + 10);

    // Trees
    gameState.trees.forEach(tree => {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(tree.pos.x - 2, tree.pos.y, 4, 12);
      ctx.fillStyle = '#166534';
      ctx.beginPath(); ctx.arc(tree.pos.x, tree.pos.y - 5, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = '7px Arial';
      ctx.fillText(tree.wood.toString(), tree.pos.x, tree.pos.y - 4);
    });

    // Buildings
    gameState.buildings.forEach(b => {
      ctx.fillStyle = b.role === 'lumberjack' ? '#451a03' : '#b45309';
      ctx.fillRect(b.pos.x, b.pos.y, b.width, b.height);
      ctx.strokeStyle = 'black';
      ctx.strokeRect(b.pos.x, b.pos.y, b.width, b.height);
      
      ctx.fillStyle = 'white';
      ctx.font = '8px monospace';
      ctx.fillText(b.role.toUpperCase(), b.pos.x + b.width/2, b.pos.y + 12);
      
      if (b.role === 'sawmill') {
         ctx.fillText(`IN:${b.inputWood} OUT:${b.outputPlanks}`, b.pos.x + b.width/2, b.pos.y + b.height - 8);
         if (b.status === 'processing') {
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(b.pos.x + 5, b.pos.y + b.height/2, b.width - 10, 4);
         }
      }
    });

    // Workers
    gameState.workers.forEach(w => {
      const { x, y } = w.pos;
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y - 6, 3, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 8); ctx.stroke();
      
      if (w.carrying) {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(x + 2, y - 2, 4, 4);
      }
      
      if (w.state === 'harvesting') {
         ctx.fillStyle = 'black';
         ctx.font = '8px Arial';
         ctx.fillText('...', x, y - 10);
      }
    });

    // UI
    ctx.fillStyle = 'black';
    ctx.textAlign = 'left';
    ctx.font = '11px monospace';
    ctx.fillText(`AURUM: ${gameState.money}ᗘ`, 20, 30);
    ctx.fillText(`PLANKS: ${gameState.planks}/10`, 20, 45);

    if (gameState.missionComplete) {
      const metrics = gameState.metrics;
      const time = metrics.startTime && metrics.endTime ? Math.floor((metrics.endTime - metrics.startTime) / 1000) : 0;
      
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(canvas.width/2 - 120, canvas.height/2 - 100, 240, 200);
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('MISSION COMPLETE', canvas.width/2, canvas.height/2 - 70);
      ctx.font = '12px monospace';
      ctx.fillText(`Time: ${time}s`, canvas.width/2, canvas.height/2 - 30);
      ctx.fillText(`Wood Harvested: ${metrics.woodHarvested}`, canvas.width/2, canvas.height/2 - 10);
      ctx.fillText(`Planks Produced: ${metrics.planksProduced}`, canvas.width/2, canvas.height/2 + 10);
      ctx.fillText(`Spent: ${metrics.moneySpent}ᗘ`, canvas.width/2, canvas.height/2 + 30);
      ctx.fillText(`Roads: ${metrics.roadsBuilt}`, canvas.width/2, canvas.height/2 + 50);
      ctx.fillText(`Trees Depleted: ${metrics.treesDepleted}`, canvas.width/2, canvas.height/2 + 70);
    }

  }, [gameState, menuPos]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 font-mono">
      <div className="w-full max-w-5xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-t-lg shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <h1 className="text-xl font-bold text-slate-200 tracking-tight ml-2 uppercase italic">AURUM CIVITAS <span className="text-[10px] font-normal opacity-50 tracking-[0.2em] ml-2 not-italic">ECONOMY_SIM</span></h1>
          </div>
        </div>

        {/* Main Game Canvas */}
        <div className="relative border-x border-slate-800 shadow-2xl bg-white overflow-hidden group">
          <canvas
            ref={canvasRef}
            width={1000}
            height={700}
            onClick={handleCanvasClick}
            className="cursor-crosshair w-full h-auto"
          />

          {/* Build Menu Overlay */}
          {menuPos && !gameState.missionComplete && (
            <div 
              className="absolute z-10 bg-slate-900 border border-slate-700 shadow-2xl rounded-md p-1 min-w-[150px] animate-in fade-in zoom-in duration-200"
              style={{ left: menuPos.x, top: menuPos.y }}
            >
              <div className="text-[10px] text-slate-500 px-2 py-1 uppercase font-bold border-b border-slate-800 mb-1">Construct</div>
              <button 
                onClick={() => buildLumberjack(menuPos.x, menuPos.y)}
                disabled={gameState.money < 50}
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-30 flex justify-between items-center transition-colors"
              >
                <span>Lumberjack</span>
                <span className="text-emerald-500">50ᗘ</span>
              </button>
              <button 
                onClick={() => buildSawmill(menuPos.x, menuPos.y)}
                disabled={gameState.money < 70}
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-30 flex justify-between items-center transition-colors"
              >
                <span>Sawmill</span>
                <span className="text-emerald-500">70ᗘ</span>
              </button>
              <button 
                onClick={() => buildRoad(menuPos.x, menuPos.y)}
                disabled={gameState.money < 5}
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-30 flex justify-between items-center transition-colors"
              >
                <span>Road Tile</span>
                <span className="text-emerald-500">5ᗘ</span>
              </button>
              <button 
                onClick={() => setMenuPos(null)}
                className="w-full text-left px-3 py-1 text-[10px] text-slate-500 hover:bg-slate-800 transition-colors border-t border-slate-800 mt-1"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Terminal / Logs */}
        <div className="bg-slate-900 border border-slate-800 rounded-b-lg p-4 shadow-xl">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">
            <span className="text-slate-400">&gt;</span> economic_simulation
          </div>
          <div className="space-y-1 h-32 overflow-y-auto custom-scrollbar">
            {gameState.logs.map((log, i) => (
              <div key={i} className="text-xs flex gap-3">
                <span className="text-slate-600">[{log.timestamp}]</span>
                <span className={log.text.includes('worker') ? 'text-blue-400' : log.text.includes('plank') ? 'text-emerald-400' : 'text-slate-400'}>
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
