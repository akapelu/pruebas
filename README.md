# Dead Grid: Tactical Assault

A complete browser-based tactical strategy prototype built with React, TypeScript, Vite, and plain CSS.

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Vite will print a local URL, usually `http://localhost:5173`.

## How To Play

Draft a squad for each faction, choose a map, and destroy the enemy base before your own base falls. In Local Hotseat, Humans plan first, then the screen hides the board before Zombies plan. In vs AI mode, the player controls Humans and the AI generates Zombie orders after the Human player presses Ready.

Each living unit can receive one order: Move, Attack, Move + Attack, Use Ability, or Wait. A unit that spends its full movement value cannot attack during that turn. Once both sides are ready, orders reveal and resolve in this order:

1. Movement
2. Attacks
3. Abilities
4. Base damage
5. Victory and start-of-next-turn effects

Terrain changes tactics: walls block movement, cover reduces incoming damage by 1, difficult terrain costs 2 movement to enter, and tall grass prevents attacks from more than 2 tiles away.

## Editing Units

Unit stats, costs, factions, and ability text live in `src/data/units.ts`.

Ability behavior is implemented in `src/logic/abilities.ts`, while passive attack modifiers such as Charge, Thick Skin, and Frenzy are handled in `src/logic/combat.ts`.

## Editing Maps

Maps live in `src/data/maps.ts`. Each map is a 9x9 string grid:

- `N`: normal
- `W`: wall
- `C`: cover
- `D`: difficult terrain
- `G`: tall grass

The Human base is at `(0, 8)` and the Zombie base is at `(8, 0)`.

## Known Limitations

This version has no backend, accounts, ranking, matchmaking, sound, online multiplayer, or advanced animation. Resolution is instant and communicated through the board state and combat log.

## Expanding Toward Online Multiplayer

The core game rules are pure TypeScript functions under `src/logic`, and the game state is centralized in React. To add online multiplayer later, keep the client-side planning UI but send signed or hidden planned orders to a server room. Once both players submit, the server should call the same `resolveTurn()` logic, broadcast the resulting state, and persist match snapshots for reconnects and dispute-free replays.
