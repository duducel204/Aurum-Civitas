"""Compile declared game assumptions onto the unchanged supplied OSM map. No network."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
map_path = ROOT / "fixtures/itaipu-start-map.json"
source_path = ROOT / "fixtures/maps/itaipu-osm-source.json.gz"
data = json.loads(map_path.read_text())
meta, grid = data["metadata"], data["grid"]
size = meta["cellSizeM"]
roads = [(x, y) for y, row in enumerate(grid) for x, c in enumerate(row) if c == "r"]
def center(cell):
    return {"x": (cell[0] + .5) * size, "y": (cell[1] + .5) * size}
def feature_center(feature):
    coords = feature["geometry"]["coordinates"][0]
    return [sum(p[i] for p in coords) / len(coords) for i in (0, 1)]
def road_anchor(fid):
    feature = next(f for f in data["features"] if f["id"] == fid)
    x, y = feature_center(feature)
    return min(roads, key=lambda p: (((p[0]+.5)*size-x)**2 + ((p[1]+.5)*size-y)**2, p))
def store(id, pos, kind, **fields):
    return {"id": id, "pos": pos, "kind": kind, "inventory": {}, "capacity": 200,
            "incorporated": {}, "buildTicks": 0, "status": "operational", **fields}
def role(label, housing=0, generation=0, demand=0, capacity=0, radius=0, connection=0):
    return {"label": label, "housing": housing, "generation": generation, "demand": demand,
            "distributionCapacity": capacity, "distributionCells": radius, "connectionCells": connection}
facilities = [
    ("osm:way/32236291", "hydro-existing", "way/32236291"),
    ("osm:way/32302779", "substation-existing", "way/32302779"),
    ("osm:way/510234533", "substation-existing", "way/510234533"),
    ("osm:way/1497605063", "solar-existing", "way/1497605063"),
]
stores = [store(id, center(road_anchor(fid)), "infrastructure", serviceRole=role_id, sourceFeatureId=fid)
          for id, role_id, fid in facilities]
anchor = road_anchor("way/32302779")
road_set = set(roads)
free = {(x+dx, y+dy) for x, y in roads for dx, dy in [(1,0),(-1,0),(0,1),(0,-1)]
        if 0 <= x+dx < meta["cols"] and 0 <= y+dy < meta["rows"] and grid[y+dy][x+dx] == "."}
queue, connected = [anchor], {anchor}
for x, y in queue:
    for dx, dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)]:
        p = x+dx, y+dy
        if p in road_set and p not in connected:
            connected.add(p); queue.append(p)
free = sorted((p for p in free if any((p[0]+dx, p[1]+dy) in connected for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)])),
              key=lambda p: ((p[0]-anchor[0])**2 + (p[1]-anchor[1])**2, p))
depot_pos = center(free[0])
stores.append(store("itaipu:depot", depot_pos, "depot", inventory={"planks":60,"stone":40,"metal":24}))
scenario = {
    "id": "AC-ITAIPU-001", "classification": "EXPERIMENTAL_GAME_SCENARIO",
    "semantic_ids": ["RME","RMF","RM0","RM1","RM2","RM3","RM4","RM5","RMD"],
    "note": "OSM facility IDs/geometry are sourced. Initial road anchors are virtual entrances. Materials, residents, capacities and electrical circuits are explicit game assumptions, not measured infrastructure data.",
    "rules": {
        "version":"itaipu-game-001", "mapSeed":meta["id"], "tickMs":250,
        "capacity":200, "harvestTicks":4, "gridSize":size, "roadSpeed":200,
        "offroadSpeed":60, "allowOffroad":False,
        "recipes":{"sawmill":{"inputs":{"wood":1},"outputs":{"planks":1},"ticks":12}},
        "construction":{
            "house":{"materials":{"planks":4,"stone":2},"ticks":12},
            "solar":{"materials":{"planks":2,"stone":2,"metal":6},"ticks":24},
            "substation":{"materials":{"planks":2,"stone":4,"metal":4},"ticks":20}
        },
        "geography":{
            "id":meta["id"],"version":"itaipu-map-001","sourceTimestamp":meta["sourceTimestamp"],
            "sourceHash":hashlib.sha256(source_path.read_bytes()).hexdigest(),
            "mapHash":hashlib.sha256(map_path.read_bytes()).hexdigest(),
            "cols":meta["cols"],"rows":meta["rows"],"cellSizeM":size,"lastMileCells":1,"grid":grid
        },
        "services":{
            "classification":"EXPERIMENTAL_GAME_UNITS",
            "roles":{
                "house":role("Casa",housing=4,demand=2),
                "solar":role("Geração solar",generation=8,capacity=8,radius=6,connection=80),
                "substation":role("Subestação local",capacity=24,radius=12,connection=80),
                "hydro-existing":role("Itaipu · geração existente",generation=120),
                "substation-existing":role("Subestação existente",capacity=24,radius=12,connection=80),
                "solar-existing":role("Solar existente",generation=8,capacity=8,radius=6,connection=80)
            },
            "existingLinks":[{"from":facilities[0][0],"to":facilities[1][0]},
                             {"from":facilities[0][0],"to":facilities[2][0]}]
        },
        "mission":{"id":"itaipu-first-powered-home","resource":"planks","delivered":1,"poweredHouses":1,"maxTicks":5000}
    },
    "stores":stores,
    "carriers":[{"id":f"itaipu:carrier-{i+1}","pos":depot_pos,"cargo":{},"target":None,"source":None,
                 "route":[],"waypoint":0,"roadVersion":0,"phase":"idle","harvest":0} for i in range(4)],
    "suggestions": [center(p) for p in free[1:13]]
}
(ROOT / "fixtures/itaipu-scenario.json").write_text(json.dumps(scenario,ensure_ascii=False,indent=2)+"\n")
manifest = {
    "id":"AC-IM1", "seed":"AC-IS1", "bindings":[
        {"module_id":"RME","implementation":"lib/aurum/geography.ts","test_id":"RTE","test_path":"tests/aurum/geography.test.ts","mission_id":"RJE","mission_path":"missions/RJE.json","evidence_path":"evidence/itaipu.json"},
        {"module_id":"RMF","implementation":"lib/aurum/infrastructure.ts","test_id":"RTF","test_path":"tests/aurum/infrastructure.test.ts","mission_id":"RJF","mission_path":"missions/RJF.json","evidence_path":"evidence/itaipu.json"}
    ],"runtime_owner":"RM1","shared_transition":True,
    "sourceHash":scenario["rules"]["geography"]["sourceHash"],"mapHash":scenario["rules"]["geography"]["mapHash"]
}
(ROOT / "projection/itaipu_manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
print(json.dumps({"scenario":scenario["id"],"existing_roads":len(roads),"existing_facilities":len(facilities),"depot":depot_pos,"first_home":scenario["suggestions"][0]}))
