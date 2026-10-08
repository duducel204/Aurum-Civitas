/** RMD/RME: read-only cartography shared by the app and the inline preview. */
import type { Point, Rules, State } from "./rules.ts";
import type { MapData, MapFeature } from "./geography.ts";
export type MapView = { center: Point; width: number };
export type MapLayers = { terrain:boolean; resources:boolean; buildings:boolean; energy:boolean };
export const defaultLayers: MapLayers = { terrain:true, resources:true, buildings:true, energy:true };
const boundsCache = new WeakMap<MapFeature, {x0:number;y0:number;x1:number;y1:number}>();
export function featureBounds(f:MapFeature) {
  const cached=boundsCache.get(f); if(cached)return cached;
  const points=rings(f).flat();
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const [x,y] of points){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  const margin=Number(f.properties.widthM??12)/2;
  const bounds={x0:x0-margin,y0:y0-margin,x1:x1+margin,y1:y1+margin};
  boundsCache.set(f,bounds);return bounds;
}
export function visibleFeatures(map:MapData,view:MapView,width:number,height:number):MapFeature[] {
  const halfHeight=view.width*height/width/2;
  return map.features.filter(f=>{const b=featureBounds(f);return b.x1>=view.center.x-view.width/2 &&
    b.x0<=view.center.x+view.width/2 && b.y1>=view.center.y-halfHeight && b.y0<=view.center.y+halfHeight;});
}
const colors: Record<string, string> = {
  water: "#72bfcb", green: "#b7d5a6", road: "#697477", building: "#cabda6",
  facility: "#8b9da9", district: "#e3dcc9",
};
function rings(feature: MapFeature): number[][][] {
  const g = feature.geometry;
  if (g.type === "LineString") return [g.coordinates as number[][]];
  if (g.type === "Polygon") return g.coordinates as number[][][];
  if (g.type === "MultiPolygon") return (g.coordinates as number[][][][]).flat();
  if (g.type === "MultiLineString") return g.coordinates as number[][][];
  return [];
}
export function screenPoint(x: number, y: number, view: MapView, width: number, height: number): Point {
  const scale = view.width / width;
  return { x: view.center.x + (x - width / 2) * scale,
    y: view.center.y + (y - height / 2) * scale };
}
export function drawItaipu(
  ctx: CanvasRenderingContext2D, map: MapData, state: State, rules: Rules,
  view: MapView, selected: Point | null, showEnergy: boolean, options:Partial<MapLayers> = {},
): void {
  const width = ctx.canvas.width, height = ctx.canvas.height, scale = width / view.width;
  const left = view.center.x - view.width / 2, top = view.center.y - height / scale / 2;
  const enabled={...defaultLayers,...options,energy:showEnergy};
  const features=visibleFeatures(map,view,width,height);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#eef0e8"; ctx.fillRect(0, 0, width, height);
  ctx.save(); ctx.scale(scale, scale); ctx.translate(-left, -top);
  const layers = ["district", "green", "water", "road", "building", "facility"];
  for (const kind of layers) {
    if ((kind==='building'||kind==='facility') ? !enabled.buildings : !enabled.terrain) continue;
    if (kind === "road" && scale * rules.gridSize >= 12) {
      ctx.strokeStyle = "#d4dbcc"; ctx.lineWidth = 1 / scale;
      const g = rules.geography!;
      const y0 = Math.max(0, Math.floor(top / rules.gridSize));
      const y1 = Math.min(g.rows, Math.ceil((top + height / scale) / rules.gridSize));
      const x0 = Math.max(0, Math.floor(left / rules.gridSize));
      const x1 = Math.min(g.cols, Math.ceil((left + view.width) / rules.gridSize));
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (g.grid[y][x] === ".")
        ctx.strokeRect(x * rules.gridSize, y * rules.gridSize, rules.gridSize, rules.gridSize);
    }
    for (const f of features) {
      if (f.properties.kind !== kind) continue;
      ctx.beginPath();
      for (const ring of rings(f)) {
        ring.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
        if (f.geometry.type.includes("Polygon")) ctx.closePath();
      }
      ctx.fillStyle = colors[kind]; ctx.strokeStyle = colors[kind];
      if (f.geometry.type.includes("Polygon")) ctx.fill("evenodd");
      else {
        ctx.lineWidth = Number(f.properties.widthM ?? (kind === "facility" ? 12 : 6));
        ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
      }
    }
  }
  if (showEnergy && state.services) {
    ctx.lineWidth = 2 / scale; ctx.strokeStyle = "#bc8d22"; ctx.setLineDash([5 / scale, 5 / scale]);
    const edges = [...state.services.connections,
      ...Object.entries(state.services.buildings).filter(([, b]) => b.provider !== null)
        .map(([id, b]) => ({ from: b.provider!, to: id }))];
    for (const l of edges) {
      const a = state.stores.find((s) => s.id === l.from), b = state.stores.find((s) => s.id === l.to);
      if (!a || !b) continue;
      ctx.beginPath(); ctx.moveTo(a.pos.x, a.pos.y); ctx.lineTo(b.pos.x, b.pos.y); ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  for (const s of state.stores) {
    const resource=s.kind==='source'||s.kind==='producer';
    if(resource?!enabled.resources:!enabled.buildings)continue;
    if(s.pos.x<left-30/scale||s.pos.x>left+view.width+30/scale||s.pos.y<top-30/scale||s.pos.y>top+height/scale+30/scale)continue;
    const pixel = 1 / scale;
    const radius = Math.max(rules.gridSize * .38, 5 * pixel);
    const role = s.serviceRole ?? s.construction;
    const service = state.services?.buildings[s.id];
    ctx.fillStyle = s.status !== "operational" ? "#bf986f" : s.kind === "depot" ? "#495c50"
      : role === "house" ? service?.powered ? "#43805c" : "#bf6252" : "#546f8c";
    ctx.fillRect(s.pos.x - radius, s.pos.y - radius, radius * 2, radius * 2);
    const glyph = s.kind === 'source' ? 'F' : s.kind === 'producer' ? 'M' : s.kind === "depot" ? "D" : role === "house" ? "C" : role?.includes("solar") ? "S"
      : role?.includes("substation") ? "E" : "H";
    // DEV-10/15: procedural silhouettes at playable scale, markers at regional scale.
    if(scale*rules.gridSize>=12){
      ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5/scale;ctx.beginPath();
      if(glyph==='C'){ctx.moveTo(s.pos.x-radius,s.pos.y);ctx.lineTo(s.pos.x,s.pos.y-radius);ctx.lineTo(s.pos.x+radius,s.pos.y);}
      else if(glyph==='S'){ctx.moveTo(s.pos.x-radius,s.pos.y);ctx.lineTo(s.pos.x+radius,s.pos.y);ctx.moveTo(s.pos.x,s.pos.y-radius);ctx.lineTo(s.pos.x,s.pos.y+radius);}
      else if(glyph==='E'){ctx.moveTo(s.pos.x+radius/2,s.pos.y-radius);ctx.lineTo(s.pos.x-radius/2,s.pos.y);ctx.lineTo(s.pos.x+radius/2,s.pos.y);ctx.lineTo(s.pos.x-radius/2,s.pos.y+radius);}
      else if(glyph==='F'){ctx.moveTo(s.pos.x,s.pos.y+radius);ctx.lineTo(s.pos.x,s.pos.y-radius);ctx.lineTo(s.pos.x-radius,s.pos.y);ctx.moveTo(s.pos.x,s.pos.y-radius);ctx.lineTo(s.pos.x+radius,s.pos.y);}
      else if(glyph==='H'){ctx.moveTo(s.pos.x-radius,s.pos.y-radius/2);ctx.lineTo(s.pos.x-radius/3,s.pos.y);ctx.lineTo(s.pos.x+radius/3,s.pos.y-radius/2);ctx.lineTo(s.pos.x+radius,s.pos.y);}
      else if(glyph==='D')ctx.rect(s.pos.x-radius*.7,s.pos.y-radius*.7,radius*1.4,radius*1.4);
      else{ctx.moveTo(s.pos.x-radius,s.pos.y-radius);ctx.lineTo(s.pos.x,s.pos.y);ctx.lineTo(s.pos.x+radius,s.pos.y-radius);}
      ctx.stroke();
    }
    ctx.fillStyle = "#ffffff"; ctx.font = `${Math.max(11, radius * scale * 1.1) / scale}px monospace`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if(scale*rules.gridSize>=12)ctx.fillText(glyph, s.pos.x, s.pos.y+radius*.55);
    if (s.kind === "site" && s.status !== "operational") {
      const ticks = rules.construction[s.construction!].ticks;
      const materials=rules.construction[s.construction!].materials;
      const cost=Object.values(materials).reduce((a,b)=>a+b,0);
      const received=Object.entries(materials).reduce((a,[r,n])=>a+Math.min(n,s.inventory[r]??0),0);
      const progress = s.status === "building" ? s.buildTicks / ticks : received/cost;
      ctx.fillStyle = "#dfd6c5"; ctx.fillRect(s.pos.x - radius, s.pos.y + radius + 3 * pixel, radius * 2, 3 * pixel);
      ctx.fillStyle = "#956733"; ctx.fillRect(s.pos.x - radius, s.pos.y + radius + 3 * pixel, radius * 2 * progress, 3 * pixel);
    }
  }
  for (const c of state.carriers) {
    if(!enabled.resources)continue;
    const r = 3 / scale;
    ctx.fillStyle = "#252e29"; ctx.fillRect(c.pos.x-r,c.pos.y-r,r*2,r*2);
    const waypoint=c.route[c.waypoint];
    if(waypoint){const angle=Math.atan2(waypoint.point.y-c.pos.y,waypoint.point.x-c.pos.x);
      ctx.save();ctx.translate(c.pos.x,c.pos.y);ctx.rotate(angle);ctx.beginPath();
      ctx.moveTo(r*3,0);ctx.lineTo(r,r);ctx.lineTo(r,-r);ctx.closePath();ctx.fill();ctx.restore();}
    if (Object.values(c.cargo).some((n) => n > 0)) {
      ctx.fillStyle = "#f0bd4d"; ctx.fillRect(c.pos.x+r,c.pos.y-r,r*1.5,r*1.5);
    }
  }
  if (selected) {
    ctx.strokeStyle = "#172a22"; ctx.lineWidth = 2 / scale;
    const x = Math.floor(selected.x / rules.gridSize) * rules.gridSize;
    const y = Math.floor(selected.y / rules.gridSize) * rules.gridSize;
    ctx.strokeRect(x + 1 / scale,y + 1 / scale,rules.gridSize - 2 / scale,rules.gridSize - 2 / scale);
  }
  ctx.restore();
}
