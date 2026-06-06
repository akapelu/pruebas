import { TURN_LIMIT, type AttackTarget, type Base, type Coord, type Faction, type GameMap, type GameState, type PlannedOrder, type PlannedOrders, type Unit, type Winner } from "../types/game";
import { applyAbility } from "./abilities";
import { applyDamage, getAttackValue } from "./combat";
import { canTargetPosition, coordKey, getBaseAt, getEffectiveMovement, getPathCost, getTargetLabel, getTerrain, manhattanDistance, sameCoord, terrainCost } from "./movement";

type UnitDamageQueue = Map<string, number>;
type BaseDamageQueue = Map<Faction, number>;

interface VictoryResult {
  winner: Winner;
  reason?: string;
}

interface MoveMetrics {
  movedTiles: Map<string, number>;
  movedCost: Map<string, number>;
}

const emptyFactionOrders = (): Record<string, PlannedOrder> => ({});

export function createEmptyOrders(): PlannedOrders {
  return {
    humans: emptyFactionOrders(),
    zombies: emptyFactionOrders(),
  };
}

export function createOrder(unit: Unit, type: PlannedOrder["type"], path: Coord[] = [], target?: AttackTarget, state?: GameState): PlannedOrder {
  const targetLabel = target && state ? getTargetLabel(target, state) : target?.kind === "base" ? "base" : "objetivo";
  const moveText = path.length > 0 ? `mover ${path.length}` : "";
  const typeLabel: Record<PlannedOrder["type"], string> = {
    wait: "Sin acción",
    move: "Mover",
    attack: "Atacar",
    moveAttack: "Mover + atacar",
    ability: "Habilidad",
  };
  const labelParts = [
    typeLabel[type],
    moveText,
    target ? targetLabel : "",
  ].filter(Boolean);

  return {
    unitId: unit.id,
    faction: unit.faction,
    type,
    path,
    target,
    label: labelParts.join(" -> "),
  };
}

export function createWaitOrder(unit: Unit): PlannedOrder {
  return {
    unitId: unit.id,
    faction: unit.faction,
    type: "wait",
    path: [],
    label: "Sin acción",
  };
}

function cloneUnit(unit: Unit): Unit {
  return {
    ...unit,
    position: { ...unit.position },
    statusEffects: unit.statusEffects.map((effect) => ({ ...effect })),
  };
}

function cloneBase(base: Base): Base {
  return {
    ...base,
    position: { ...base.position },
  };
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    units: state.units.map(cloneUnit),
    bases: {
      humans: cloneBase(state.bases.humans),
      zombies: cloneBase(state.bases.zombies),
    },
    plannedOrders: {
      humans: { ...state.plannedOrders.humans },
      zombies: { ...state.plannedOrders.zombies },
    },
    combatLog: [...state.combatLog],
  };
}

function replaceUnit(units: Unit[], nextUnit: Unit): Unit[] {
  return units.map((unit) => (unit.id === nextUnit.id ? nextUnit : unit));
}

function addDamage(queue: UnitDamageQueue, unitId: string, damage: number): void {
  queue.set(unitId, (queue.get(unitId) ?? 0) + damage);
}

function addBaseDamage(queue: BaseDamageQueue, faction: Faction, damage: number): void {
  queue.set(faction, (queue.get(faction) ?? 0) + damage);
}

function getOrderForUnit(orders: PlannedOrders, unit: Unit): PlannedOrder {
  return orders[unit.faction][unit.id] ?? createWaitOrder(unit);
}

function isEnemyCollision(intents: Array<{ unit: Unit }>): boolean {
  return new Set(intents.map((intent) => intent.unit.faction)).size > 1;
}

function currentPositionMap(units: Unit[]): Map<string, string> {
  const positions = new Map<string, string>();
  for (const unit of units.filter((candidate) => candidate.alive)) {
    positions.set(coordKey(unit.position), unit.id);
  }
  return positions;
}

function resolveMovement(state: GameState, orders: PlannedOrders, map: GameMap, logs: string[]): MoveMetrics {
  const movedTiles = new Map<string, number>();
  const movedCost = new Map<string, number>();
  const longestPath = Math.max(
    0,
    ...state.units.filter((unit) => unit.alive).map((unit) => getOrderForUnit(orders, unit).path.length),
  );

  for (let step = 0; step < longestPath; step += 1) {
    const aliveUnits = state.units.filter((unit) => unit.alive);
    const positions = currentPositionMap(aliveUnits);
    const intents: Array<{ unit: Unit; from: Coord; to: Coord }> = [];

    for (const unit of aliveUnits) {
      const order = getOrderForUnit(orders, unit);
      const destination = order.path[step];
      if (!destination) {
        continue;
      }

      const terrain = getTerrain(map, destination);
      const movementBudget = getEffectiveMovement(unit, state.turn);
      const attemptedCost = (movedCost.get(unit.id) ?? 0) + (terrain ? terrainCost(terrain) : 999);
      if (!terrain || terrain === "wall" || getBaseAt(state, destination) || attemptedCost > movementBudget || manhattanDistance(unit.position, destination) !== 1) {
        logs.push(`${unit.name} no puede continuar el movimiento y se detiene.`);
        continue;
      }

      intents.push({ unit, from: unit.position, to: destination });
    }

    const blocked = new Set<string>();
    const collisionDamage: UnitDamageQueue = new Map();
    const byTarget = new Map<string, Array<{ unit: Unit; from: Coord; to: Coord }>>();

    for (const intent of intents) {
      const key = coordKey(intent.to);
      byTarget.set(key, [...(byTarget.get(key) ?? []), intent]);
    }

    for (const targetIntents of byTarget.values()) {
      if (targetIntents.length <= 1) {
        continue;
      }
      for (const intent of targetIntents) {
        blocked.add(intent.unit.id);
      }
      if (isEnemyCollision(targetIntents)) {
        for (const intent of targetIntents) {
          addDamage(collisionDamage, intent.unit.id, 2);
        }
        logs.push(`Choque en (${targetIntents[0].to.x}, ${targetIntents[0].to.y}); los enemigos implicados reciben 2 de daño y se detienen.`);
      } else {
        logs.push(`Aliados bloquean el movimiento en (${targetIntents[0].to.x}, ${targetIntents[0].to.y}).`);
      }
    }

    for (const first of intents) {
      for (const second of intents) {
        if (first.unit.id >= second.unit.id || first.unit.faction === second.unit.faction) {
          continue;
        }
        if (sameCoord(first.to, second.from) && sameCoord(second.to, first.from)) {
          blocked.add(first.unit.id);
          blocked.add(second.unit.id);
          addDamage(collisionDamage, first.unit.id, 2);
          addDamage(collisionDamage, second.unit.id, 2);
          logs.push(`${first.unit.name} y ${second.unit.name} chocan al cruzarse; ambos reciben 2 de daño.`);
        }
      }
    }

    for (const [unitId, damage] of collisionDamage.entries()) {
      const unit = state.units.find((candidate) => candidate.id === unitId);
      if (!unit || !unit.alive) {
        continue;
      }
      const result = applyDamage(unit, damage, map, { ignoreCover: true });
      state.units = replaceUnit(state.units, result.unit);
      logs.push(`${unit.name} recibe ${result.finalDamage} de daño por choque.`);
    }

    const movingAway = new Set(intents.filter((intent) => !blocked.has(intent.unit.id)).map((intent) => intent.unit.id));
    for (const intent of intents) {
      if (blocked.has(intent.unit.id)) {
        continue;
      }
      const occupyingUnitId = positions.get(coordKey(intent.to));
      if (occupyingUnitId && !movingAway.has(occupyingUnitId)) {
        blocked.add(intent.unit.id);
        logs.push(`${intent.unit.name} queda bloqueado por una casilla ocupada.`);
      }
    }

    for (const intent of intents) {
      const current = state.units.find((unit) => unit.id === intent.unit.id);
      if (!current || !current.alive || blocked.has(intent.unit.id)) {
        continue;
      }
      const terrain = getTerrain(map, intent.to);
      state.units = replaceUnit(state.units, {
        ...current,
        position: intent.to,
      });
      movedTiles.set(current.id, (movedTiles.get(current.id) ?? 0) + 1);
      movedCost.set(current.id, (movedCost.get(current.id) ?? 0) + (terrain ? terrainCost(terrain) : 0));
    }
  }

  return { movedTiles, movedCost };
}

function canResolveAttack(attacker: Unit, target: AttackTarget, state: GameState, map: GameMap): boolean {
  if (target.kind === "base") {
    const base = state.bases[target.faction];
    return attacker.faction !== target.faction && base.hp > 0 && manhattanDistance(attacker.position, base.position) <= attacker.range;
  }

  const targetUnit = state.units.find((unit) => unit.id === target.unitId && unit.alive);
  return !!targetUnit && targetUnit.faction !== attacker.faction && canTargetPosition(attacker.position, targetUnit.position, attacker.range, map);
}

function queueAttacks(state: GameState, orders: PlannedOrders, map: GameMap, moveMetrics: MoveMetrics, logs: string[]): { unitDamage: UnitDamageQueue; baseDamage: BaseDamageQueue } {
  const unitDamage: UnitDamageQueue = new Map();
  const baseDamage: BaseDamageQueue = new Map();

  for (const attacker of state.units.filter((unit) => unit.alive)) {
    const order = getOrderForUnit(orders, attacker);
    if ((order.type !== "attack" && order.type !== "moveAttack") || !order.target) {
      continue;
    }

    const movementCost = moveMetrics.movedCost.get(attacker.id) ?? 0;
    const movementBudget = getEffectiveMovement(attacker, state.turn);
    if (order.type === "moveAttack" && movementCost >= movementBudget && movementBudget > 0) {
      logs.push(`${attacker.name} usó todo su movimiento y no puede atacar.`);
      continue;
    }

    if (!canResolveAttack(attacker, order.target, state, map)) {
      logs.push(`El ataque de ${attacker.name} está fuera de alcance o bloqueado por hierba alta.`);
      continue;
    }

    const attackValue = getAttackValue(attacker, moveMetrics.movedTiles.get(attacker.id) ?? 0);
    if (order.target.kind === "base") {
      addBaseDamage(baseDamage, order.target.faction, attackValue.damage);
      logs.push(`${attacker.name} prepara ${attackValue.damage} de daño contra la base ${order.target.faction === "humans" ? "humana" : "zombi"}.`);
      continue;
    }

    const targetUnitId = order.target.unitId;
    const target = state.units.find((unit) => unit.id === targetUnitId && unit.alive);
    if (!target) {
      continue;
    }
    const result = applyDamage(target, attackValue.damage, map, { ignoreCover: attacker.abilityKey === "preciseShot" });
    addDamage(unitDamage, target.id, result.finalDamage);
    const notes = [...attackValue.notes, ...result.notes].join(", ");
    logs.push(`${attacker.name} ataca a ${target.name} por ${result.finalDamage} de daño${notes ? ` (${notes})` : ""}.`);
  }

  return { unitDamage, baseDamage };
}

function applyQueuedUnitDamage(state: GameState, damageQueue: UnitDamageQueue): void {
  for (const [unitId, damage] of damageQueue.entries()) {
    const unit = state.units.find((candidate) => candidate.id === unitId);
    if (!unit || !unit.alive) {
      continue;
    }
    const hp = Math.max(0, unit.hp - damage);
    state.units = replaceUnit(state.units, {
      ...unit,
      hp,
      alive: hp > 0,
    });
  }
}

function resolveAbilities(state: GameState, orders: PlannedOrders, map: GameMap, logs: string[]): void {
  const abilityOrders = state.units
    .filter((unit) => unit.alive)
    .map((unit) => ({ unit, order: getOrderForUnit(orders, unit) }))
    .filter(({ order }) => order.type === "ability")
    .sort((a, b) => a.unit.id.localeCompare(b.unit.id));

  for (const { unit, order } of abilityOrders) {
    const currentCaster = state.units.find((candidate) => candidate.id === unit.id && candidate.alive);
    if (!currentCaster) {
      continue;
    }
    const result = applyAbility(currentCaster, order, state.units, state.bases, map, state.turn);
    state.units = result.units;
    state.bases = result.bases;
    logs.push(...result.logs);
  }
}

function applyBaseDamage(state: GameState, queue: BaseDamageQueue, logs: string[]): void {
  for (const [faction, damage] of queue.entries()) {
    const base = state.bases[faction];
    const nextHp = Math.max(0, base.hp - damage);
    state.bases = {
      ...state.bases,
      [faction]: {
        ...base,
        hp: nextHp,
      },
    };
    logs.push(`La base ${faction === "humans" ? "humana" : "zombi"} recibe ${damage} de daño.`);
  }
}

function applyStartTurnEffects(units: Unit[], map: GameMap, turn: number, logs: string[]): Unit[] {
  return units.map((unit) => {
    if (!unit.alive) {
      return unit;
    }

    let nextUnit = {
      ...unit,
      statusEffects: unit.statusEffects.filter((effect) => effect.type !== "suppressed" || effect.expiresOnTurn >= turn),
    };

    const poison = nextUnit.statusEffects.find((effect) => effect.type === "poisoned" && effect.expiresOnTurn <= turn);
    if (poison) {
      const damage = applyDamage(nextUnit, 1, map, { ignoreCover: true });
      nextUnit = {
        ...damage.unit,
        statusEffects: damage.unit.statusEffects.filter((effect) => effect.type !== "poisoned"),
      };
      logs.push(`${unit.name} sufre ${damage.finalDamage} de daño por veneno al inicio del turno ${turn}.`);
    }

    return nextUnit;
  });
}

export function checkVictory(state: GameState): VictoryResult {
  const humanBaseDestroyed = state.bases.humans.hp <= 0;
  const zombieBaseDestroyed = state.bases.zombies.hp <= 0;

  if (humanBaseDestroyed && zombieBaseDestroyed) {
    return { winner: "draw", reason: "Ambas bases cayeron en el mismo turno." };
  }
  if (humanBaseDestroyed) {
    return { winner: "zombies", reason: "La base humana fue destruida." };
  }
  if (zombieBaseDestroyed) {
    return { winner: "humans", reason: "La base zombi fue destruida." };
  }

  if (state.turn >= TURN_LIMIT) {
    if (state.bases.humans.hp === state.bases.zombies.hp) {
      return { winner: "draw", reason: `El turno ${TURN_LIMIT} terminó con ambas bases empatadas.` };
    }
    return {
      winner: state.bases.humans.hp > state.bases.zombies.hp ? "humans" : "zombies",
      reason: `El turno ${TURN_LIMIT} terminó; gana la base con más PV.`,
    };
  }

  return { winner: null };
}

export function resolveTurn(inputState: GameState, map: GameMap): GameState {
  const state = cloneState(inputState);
  const orders = state.plannedOrders;
  const logs: string[] = [`Turno ${state.turn}: órdenes reveladas.`];

  logs.push("Fase de movimiento.");
  const moveMetrics = resolveMovement(state, orders, map, logs);

  logs.push("Fase de ataques.");
  const queuedDamage = queueAttacks(state, orders, map, moveMetrics, logs);
  applyQueuedUnitDamage(state, queuedDamage.unitDamage);

  logs.push("Fase de habilidades.");
  resolveAbilities(state, orders, map, logs);

  logs.push("Daño a bases.");
  applyBaseDamage(state, queuedDamage.baseDamage, logs);

  state.units = state.units.filter((unit) => unit.alive);
  const victory = checkVictory(state);
  if (victory.winner) {
    return {
      ...state,
      phase: "gameOver",
      activePlanner: null,
      plannedOrders: createEmptyOrders(),
      combatLog: [...logs, ...state.combatLog].slice(0, 120),
      winner: victory.winner,
      victoryReason: victory.reason,
    };
  }

  const nextTurn = state.turn + 1;
  const startLogs: string[] = [`Empieza el turno ${nextTurn}.`];
  const nextUnits = applyStartTurnEffects(state.units, map, nextTurn, startLogs).filter((unit) => unit.alive);

  return {
    ...state,
    turn: nextTurn,
    phase: "planning",
    activePlanner: "humans",
    units: nextUnits,
    plannedOrders: createEmptyOrders(),
    combatLog: [...startLogs, ...logs, ...state.combatLog].slice(0, 120),
    winner: null,
    victoryReason: undefined,
  };
}

export function withReadyOrders(state: GameState, faction: Faction): PlannedOrders {
  const nextOrders: PlannedOrders = {
    humans: { ...state.plannedOrders.humans },
    zombies: { ...state.plannedOrders.zombies },
  };
  for (const unit of state.units.filter((candidate) => candidate.alive && candidate.faction === faction)) {
    if (!nextOrders[faction][unit.id]) {
      nextOrders[faction][unit.id] = createWaitOrder(unit);
    }
  }
  return nextOrders;
}
