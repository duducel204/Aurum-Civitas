# Aurum Civitas

Aurum Civitas is an intentionally small open-source economy game for developers.

The current goal is not content volume. It is to prove one loop:

```
place infrastructure
→ workers execute it
→ resources move physically
→ production happens over time
→ the world records what happened
→ restart the same world and try another layout
```

## Mission 001

Produce 10 planks.

Current chain:

```
Tree → Lumberjack → Worker → Road network → Sawmill → Plank
```

Rules already implemented:

- trees contain finite wood;
- harvesting takes real time;
- lumberjacks only work within a local radius;
- buildings take time to become operational;
- workers prefer connected roads and move faster on them;
- wood must be physically carried;
- sawmills consume delivered wood and produce planks over time;
- the same initial world can be restarted;
- mission metrics record time, harvested wood, planks, spending, roads and depleted trees.

## Run locally

```bash
npm install
npm run dev
```

Then open the local Next.js URL shown in the terminal.

## Where the game lives

`lib/game-engine.ts`
- world state;
- entities;
- building definitions;
- worker behavior;
- production timing;
- road routing;
- mission constants.

`components/game/game-world.tsx`
- canvas rendering;
- player input;
- runtime loop;
- metrics display.

Keep simulation rules in the engine whenever possible. Keep drawing and interaction in the world component.

## Extending the world

The project is being kept deliberately small so future contributors can add one capability at a time.

Good first extensions:

- a new building role;
- a new resource;
- a new production rule;
- a new mission;
- a better visual representation;
- a robustness or replay test.

Avoid adding large infrastructure before the current loop proves it is needed.

### Contribution principle

A contribution is not valuable because it is large.

It is valuable when it changes something observable in the world and that change can be tested.

Preferred loop:

```
idea → branch → change → run → evidence → compare → pull request
```

## Design rule

Git records what was changed.

The runtime shows whether the change works.

The long-term project may connect player identity, missions, forks, evidence and shared worlds to GitHub, but the current build intentionally focuses only on the executable economic core.
