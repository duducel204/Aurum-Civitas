'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { INITIAL_STATE, GameState, updateWorker, Worker, Building, GRID_SIZE, LUMBERJACK_RADIUS } from '@/lib/game-engine';

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
        createLog('[system] simulation ready.'),
        createLog('[tutorial] click to build. wood is finite.'),
      ],
    }));
  }, [createLog]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
        pos: { x: snappedX, y: snappedY },
        width: 60,
        height: 60,
      };

      const newWorker: Worker = {
        id: `worker-${newBuilding.id}`,
        type: 'worker',
        pos: { x: snappedX + 30, y: snappedY + 30 },
        state: 'idle',
        targetTreeId: null,
        homeBuildingId: newBuilding.id,
        carrying: false,
        speed: 120, // This will be overriden by updateWorker's logic (ROAD/OFFROAD)
        harvestTimer: 0,
      };

      setGameState(prev => ({
        ...prev,
        money: prev.money - 50,
        buildings: [...prev.buildings, newBuilding],
        workers: [...prev.workers, newWorker],
        logs: [...prev.logs, createLog(`[system] lumberjack station operational`)].slice(-10),
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
        logs: [...prev.logs, createLog(`[system] road tile placed`)].slice(-10),
      }));
    }
    setMenuPos(null);
  };

  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== null) {
      const dt = (time - previousTimeRef.current) / 1000;

      setGameState(prev => {
        let totalWoodGained = 0;
        const newLogs: string[] = [];
        
        const updatedWorkers = prev.workers.map(w => {
          const { worker, woodGained, log } = updateWorker(w, prev, dt);
          totalWoodGained += woodGained;
          if (log) newLogs.push(log);
          return worker;
        });

        // Filter trees with wood > 0
        const updatedTrees = prev.trees.filter(t => t.wood > 0);

        const newWood = prev.wood + totalWoodGained;
        const missionComplete = !prev.missionComplete && newWood >= 20;
        
        const logEntries = newLogs.map(l => createLog(l));
        if (missionComplete) logEntries.push(createLog('[mission] MISSION COMPLETE: 20 wood collected.'));

        return {
          ...prev,
          workers: updatedWorkers,
          trees: updatedTrees,
          wood: newWood,
          missionComplete: prev.missionComplete || missionComplete,
          logs: [...prev.logs, ...logEntries].slice(-10),
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

    // Clear
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Roads
    ctx.fillStyle = '#e2e8f0';
    Object.keys(gameState.roads).forEach(key => {
      const [gx, gy] = key.split(',').map(Number);
      ctx.fillRect(gx * GRID_SIZE, gy * GRID_SIZE, GRID_SIZE, GRID_SIZE);
    });

    // Range UI
    if (menuPos) {
       ctx.beginPath();
       ctx.arc(menuPos.x, menuPos.y, LUMBERJACK_RADIUS, 0, Math.PI * 2);
       ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
       ctx.setLineDash([5, 5]);
       ctx.stroke();
       ctx.setLineDash([]);
    }

    // Draw Base
    const base = gameState.base;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(base.pos.x, base.pos.y, base.width, base.height);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.strokeRect(base.pos.x, base.pos.y, base.width, base.height);
    ctx.fillStyle = 'black';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BASE', base.pos.x + base.width/2, base.pos.y + base.height/2 + 4);

    // Draw Trees
    gameState.trees.forEach(tree => {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(tree.pos.x - 2, tree.pos.y, 4, 15);
      ctx.fillStyle = '#166534';
      ctx.beginPath(); ctx.arc(tree.pos.x, tree.pos.y - 5, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = '8px Arial';
      ctx.fillText(tree.wood.toString(), tree.pos.x, tree.pos.y - 4);
    });

    // Draw Buildings
    gameState.buildings.forEach(b => {
      ctx.fillStyle = '#451a03';
      ctx.fillRect(b.pos.x, b.pos.y, b.width, b.height);
      ctx.strokeStyle = 'black';
      ctx.strokeRect(b.pos.x, b.pos.y, b.width, b.height);
    });

    // Draw Workers
    gameState.workers.forEach(w => {
      const { x, y } = w.pos;
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 1;
      // Head
      ctx.beginPath(); ctx.arc(x, y - 8, 4, 0, Math.PI * 2); ctx.stroke();
      // Body
      ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 10); ctx.stroke();
      // Arms
      ctx.beginPath(); ctx.moveTo(x - 5, y + 2); ctx.lineTo(x + 5, y + 2); ctx.stroke();
      // Legs
      ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x - 4, y + 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x + 4, y + 18); ctx.stroke();

      if (w.carrying) {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(x + 3, y - 4, 5, 5);
      }
      
      if (w.state === 'harvesting') {
         ctx.fillStyle = 'black';
         ctx.font = '10px Arial';
         ctx.fillText('...', x, y - 15);
      }
    });

    // UI
    ctx.fillStyle = 'black';
    ctx.textAlign = 'left';
    ctx.font = '12px monospace';
    ctx.fillText(`CASH: $${gameState.money}`, 20, 30);
    ctx.fillText(`WOOD: ${gameState.wood}/20`, 20, 50);

    if (gameState.missionComplete) {
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(0, canvas.height/2 - 40, canvas.width, 80);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 30px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('MISSION COMPLETE', canvas.width/2, canvas.height/2 + 10);
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
            <h1 className="text-xl font-bold text-slate-200 tracking-tight ml-2 uppercase italic">AURUM CIVITAS <span className="text-[10px] font-normal opacity-50 tracking-[0.2em] ml-2 not-italic">VIBE_SIM_BETA</span></h1>
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
                <span className="text-emerald-500">$50</span>
              </button>
              <button 
                onClick={() => buildRoad(menuPos.x, menuPos.y)}
                disabled={gameState.money < 5}
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-30 flex justify-between items-center transition-colors"
              >
                <span>Road Tile</span>
                <span className="text-emerald-500">$5</span>
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
            <span className="text-slate-400">&gt;</span> runtime_output
          </div>
          <div className="space-y-1 h-32 overflow-y-auto custom-scrollbar">
            {gameState.logs.map((log, i) => (
              <div key={i} className="text-xs flex gap-3">
                <span className="text-slate-600">[{log.timestamp}]</span>
                <span className={log.text.includes('worker') ? 'text-blue-400' : log.text.includes('base') ? 'text-emerald-400' : log.text.includes('system') ? 'text-slate-400' : 'text-yellow-400'}>
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
