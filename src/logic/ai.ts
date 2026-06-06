import type { Faction, GameMap, GameState, PlannedOrder, PlannedOrders, Unit } from "../types/game";
import { createOrder } from "./turnResolution";
import { getMovementOptions, getValidAttackTargets, manhattanDistance } from "./movement";

function nearestEnemy(unit: Unit, state: GameState): Unit | undefined {
  return state.units
    .filter((candidate) => candidate.alive && candidate.faction !== unit.faction)
    .sort((a, b) => {
      const aScore = manhattanDistance(unit.position, a.position) * 3 - (a.maxHp - a.hp);
      const bScore = manhattanDistance(unit.position, b.position) * 3 - (b.maxHp - b.hp);
      return aScore - bScore;
    })[0];
}

function chooseBestMove(unit: Unit, state: GameState, map: GameMap, targetPosition: { x: number; y: number }) {
  return getMovementOptions(unit, state, map)
    .sort((a, b) => {
      const distanceScore = manhattanDistance(a.position, targetPosition) - manhattanDistance(b.position, targetPosition);
      if (distanceScore !== 0) {
        return distanceScore;
      }
      return b.cost - a.cost;
    })[0];
}

export function generateAiOrders(state: GameState, map: GameMap, faction: Faction = "zombies"): PlannedOrders[Faction] {
  const orders: Record<string, PlannedOrder> = {};

  for (const unit of state.units.filter((candidate) => candidate.alive && candidate.faction === faction)) {
    const enemyBase = Object.values(state.bases).find((base) => base.faction !== faction);
    const availableTargets = getValidAttackTargets(unit, state, map);
    const damagedTarget = availableTargets.find((target) => {
      if (target.kind !== "unit") {
        return false;
      }
      const targetUnit = state.units.find((candidate) => candidate.id === target.unitId);
      return !!targetUnit && targetUnit.hp < targetUnit.maxHp;
    });
    const baseTarget = availableTargets.find((target) => target.kind === "base");
    const unitTarget = damagedTarget ?? availableTargets.find((target) => target.kind === "unit");

    if (baseTarget && (!unitTarget || (state.turn + unit.id.length) % 3 === 0)) {
      orders[unit.id] = createOrder(unit, "attack", [], baseTarget, state);
      continue;
    }

    if (unitTarget) {
      const useAcid = unit.abilityKey === "acidSpit" && unitTarget.kind === "unit" && (state.turn + unit.id.length) % 2 === 0;
      orders[unit.id] = createOrder(unit, useAcid ? "ability" : "attack", [], unitTarget, state);
      continue;
    }

    const priorityEnemy = nearestEnemy(unit, state);
    const targetPosition = priorityEnemy?.position ?? enemyBase?.position;
    if (!targetPosition) {
      orders[unit.id] = createOrder(unit, "wait");
      continue;
    }

    const move = chooseBestMove(unit, state, map, targetPosition);
    if (!move) {
      orders[unit.id] = createOrder(unit, "wait");
      continue;
    }

    const simulatedUnit = { ...unit, position: move.position };
    const targetsAfterMove = getValidAttackTargets(simulatedUnit, state, map, move.position);
    const baseAfterMove = targetsAfterMove.find((target) => target.kind === "base");
    const unitAfterMove = targetsAfterMove.find((target) => target.kind === "unit");
    const canAttackAfterMove = move.cost < unit.movement;

    if (canAttackAfterMove && baseAfterMove && (state.turn + unit.id.length) % 3 === 0) {
      orders[unit.id] = createOrder(unit, "moveAttack", move.path, baseAfterMove, state);
    } else if (canAttackAfterMove && unitAfterMove) {
      orders[unit.id] = createOrder(unit, "moveAttack", move.path, unitAfterMove, state);
    } else {
      orders[unit.id] = createOrder(unit, "move", move.path, undefined, state);
    }
  }

  return orders;
}
