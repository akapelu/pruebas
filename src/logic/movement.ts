import { BOARD_SIZE, type AttackTarget, type Coord, type GameMap, type GameState, type MovementOption, type TerrainType, type Unit } from "../types/game";

const DIRECTIONS: Coord[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export function coordKey(coord: Coord): string {
  return `${coord.x},${coord.y}`;
}

export function sameCoord(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y;
}

export function manhattanDistance(a: Coord, b: Coord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function isInBounds(coord: Coord): boolean {
  return coord.x >= 0 && coord.x < BOARD_SIZE && coord.y >= 0 && coord.y < BOARD_SIZE;
}

export function getTerrain(map: GameMap, coord: Coord): TerrainType | null {
  if (!isInBounds(coord)) {
    return null;
  }
  return map.terrain[coord.y][coord.x];
}

export function terrainCost(terrain: TerrainType): number {
  return terrain === "difficult" ? 2 : 1;
}

export function getEffectiveMovement(unit: Unit, turn: number): number {
  const suppressed = unit.statusEffects.some((effect) => effect.type === "suppressed" && effect.expiresOnTurn >= turn);
  return Math.max(0, unit.movement - (suppressed ? 1 : 0));
}

export function getLivingUnits(state: GameState): Unit[] {
  return state.units.filter((unit) => unit.alive);
}

export function getUnitAt(state: GameState, coord: Coord): Unit | undefined {
  return getLivingUnits(state).find((unit) => sameCoord(unit.position, coord));
}

export function getBaseAt(state: GameState, coord: Coord) {
  return Object.values(state.bases).find((base) => sameCoord(base.position, coord));
}

export function isWalkableForMovement(map: GameMap, state: GameState, coord: Coord, movingUnitId: string): boolean {
  const terrain = getTerrain(map, coord);
  if (!terrain || terrain === "wall") {
    return false;
  }
  if (getBaseAt(state, coord)) {
    return false;
  }
  const occupyingUnit = getUnitAt(state, coord);
  return !occupyingUnit || occupyingUnit.id === movingUnitId;
}

export function getMovementOptions(unit: Unit, state: GameState, map: GameMap): MovementOption[] {
  const maxMovement = getEffectiveMovement(unit, state.turn);
  const options = new Map<string, MovementOption>();
  const queue: MovementOption[] = [{ position: unit.position, path: [], cost: 0 }];
  const bestCost = new Map<string, number>([[coordKey(unit.position), 0]]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    for (const direction of DIRECTIONS) {
      const next = { x: current.position.x + direction.x, y: current.position.y + direction.y };
      const terrain = getTerrain(map, next);
      if (!terrain || terrain === "wall" || getBaseAt(state, next)) {
        continue;
      }
      const occupyingUnit = getUnitAt(state, next);
      if (occupyingUnit && occupyingUnit.id !== unit.id) {
        continue;
      }

      const nextCost = current.cost + terrainCost(terrain);
      if (nextCost > maxMovement) {
        continue;
      }

      const key = coordKey(next);
      const knownCost = bestCost.get(key);
      if (knownCost !== undefined && knownCost <= nextCost) {
        continue;
      }

      const nextOption = {
        position: next,
        path: [...current.path, next],
        cost: nextCost,
      };
      bestCost.set(key, nextCost);
      queue.push(nextOption);
      options.set(key, nextOption);
    }
  }

  return [...options.values()];
}

export function getValidMovementTiles(unit: Unit, state: GameState, map: GameMap): Coord[] {
  return getMovementOptions(unit, state, map).map((option) => option.position);
}

export function findPath(unit: Unit, destination: Coord, state: GameState, map: GameMap): Coord[] {
  if (sameCoord(unit.position, destination)) {
    return [];
  }
  return getMovementOptions(unit, state, map).find((option) => sameCoord(option.position, destination))?.path ?? [];
}

export function getPathCost(path: Coord[], map: GameMap): number {
  return path.reduce((total, coord) => {
    const terrain = getTerrain(map, coord);
    return terrain ? total + terrainCost(terrain) : total;
  }, 0);
}

export function canTargetPosition(attackerPosition: Coord, targetPosition: Coord, range: number, map: GameMap): boolean {
  const distance = manhattanDistance(attackerPosition, targetPosition);
  if (distance > range) {
    return false;
  }
  const terrain = getTerrain(map, targetPosition);
  return !(terrain === "grass" && distance > 2);
}

export function getValidAttackTargets(
  unit: Unit,
  state: GameState,
  map: GameMap,
  origin: Coord = unit.position,
  targetSide: "enemy" | "ally" = "enemy",
  rangeOverride?: number,
  includeBases = targetSide === "enemy",
): AttackTarget[] {
  const range = rangeOverride ?? unit.range;
  const targets: AttackTarget[] = [];

  for (const candidate of getLivingUnits(state)) {
    if (candidate.id === unit.id) {
      continue;
    }
    const isTargetFaction = targetSide === "enemy" ? candidate.faction !== unit.faction : candidate.faction === unit.faction;
    if (!isTargetFaction) {
      continue;
    }
    if (canTargetPosition(origin, candidate.position, range, map)) {
      targets.push({
        kind: "unit",
        unitId: candidate.id,
        faction: candidate.faction,
        position: candidate.position,
      });
    }
  }

  if (includeBases && targetSide === "enemy") {
    const enemyBase = Object.values(state.bases).find((base) => base.faction !== unit.faction);
    if (enemyBase && manhattanDistance(origin, enemyBase.position) <= range) {
      targets.push({
        kind: "base",
        faction: enemyBase.faction,
        position: enemyBase.position,
      });
    }
  }

  return targets;
}

export function getTargetLabel(target: AttackTarget, state: GameState): string {
  if (target.kind === "base") {
    return target.faction === "humans" ? "Base humana" : "Base zombi";
  }
  return state.units.find((unit) => unit.id === target.unitId)?.name ?? "Unidad desconocida";
}
