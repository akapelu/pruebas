import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { getMap } from "../data/maps";
import { getAbilityTargets } from "../logic/abilities";
import { generateAiOrders } from "../logic/ai";
import { createOrder, resolveTurn, withReadyOrders } from "../logic/turnResolution";
import { getEffectiveMovement, getMovementOptions, getPathCost, getTargetLabel, getValidAttackTargets, sameCoord } from "../logic/movement";
import type { AttackTarget, Coord, Faction, GameState, PlannedOrder, Unit } from "../types/game";
import Board from "./Board";
import CombatLog from "./CombatLog";
import UnitPanel from "./UnitPanel";
import { unitInitials } from "./UnitToken";

interface GameScreenProps {
  state: GameState;
  onStateChange: (state: GameState) => void;
  onExit: () => void;
}

type PlanningMode = "inspect" | "move" | "attack" | "moveAttack" | "ability";

interface DragState {
  unitId: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  hasMoved: boolean;
  target?: Coord;
}

function factionLabel(faction: Faction | null): string {
  if (!faction) {
    return "Nadie";
  }
  return faction === "humans" ? "Humanos" : "Zombis";
}

function orderSummary(order: PlannedOrder, state: GameState): string {
  if (order.target) {
    return `${order.label} (${getTargetLabel(order.target, state)})`;
  }
  return order.label;
}

export default function GameScreen({ state, onStateChange, onExit }: GameScreenProps) {
  const map = getMap(state.mapId);
  const [selectedUnitId, setSelectedUnitId] = useState<string | undefined>(state.units.find((unit) => unit.faction === state.activePlanner)?.id);
  const [planningMode, setPlanningMode] = useState<PlanningMode>("move");
  const [pendingPath, setPendingPath] = useState<Coord[]>([]);
  const [notice, setNotice] = useState<string>("");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const selectedUnit = state.units.find((unit) => unit.id === selectedUnitId);
  const canPlan = state.phase === "planning" && !!state.activePlanner;
  const selectedOrder = selectedUnit ? state.plannedOrders[selectedUnit.faction][selectedUnit.id] : undefined;
  const selectedOrderPath =
    selectedOrder?.type === "move" || selectedOrder?.type === "moveAttack" ? selectedOrder.path : [];
  const activePath = pendingPath.length > 0 ? pendingPath : selectedOrderPath;

  function coordFromPointer(clientX: number, clientY: number): Coord | undefined {
    const element = document.elementFromPoint(clientX, clientY);
    const tile = element instanceof HTMLElement ? element.closest<HTMLElement>("[data-x][data-y]") : null;
    if (!tile) {
      return undefined;
    }
    const x = Number(tile.dataset.x);
    const y = Number(tile.dataset.y);
    if (Number.isNaN(x) || Number.isNaN(y)) {
      return undefined;
    }
    return { x, y };
  }

  function updateDrag(nextDrag: DragState | null) {
    dragRef.current = nextDrag;
    setDragState(nextDrag);
  }

  function targetMatches(candidate: AttackTarget, target: AttackTarget): boolean {
    if (candidate.kind !== target.kind) {
      return false;
    }
    return candidate.kind === "unit"
      ? target.kind === "unit" && candidate.unitId === target.unitId
      : target.kind === "base" && candidate.faction === target.faction;
  }

  function enemyTargetAt(unit: Unit, coord: Coord): AttackTarget | undefined {
    const targetUnit = state.units.find((candidate) => candidate.alive && candidate.faction !== unit.faction && sameCoord(candidate.position, coord));
    if (targetUnit) {
      return {
        kind: "unit",
        unitId: targetUnit.id,
        faction: targetUnit.faction,
        position: targetUnit.position,
      };
    }

    const targetBase = Object.values(state.bases).find((base) => base.faction !== unit.faction && sameCoord(base.position, coord));
    if (targetBase) {
      return {
        kind: "base",
        faction: targetBase.faction,
        position: targetBase.position,
      };
    }

    return undefined;
  }

  function findMoveAttackPath(unit: Unit, target: AttackTarget): Coord[] | undefined {
    const movementBudget = getEffectiveMovement(unit, state.turn);
    return getMovementOptions(unit, state, map)
      .filter((option) => option.cost < movementBudget)
      .filter((option) => {
        const simulatedUnit = { ...unit, position: option.position };
        return getValidAttackTargets(simulatedUnit, state, map, option.position).some((candidate) => targetMatches(candidate, target));
      })
      .sort((a, b) => a.cost - b.cost || a.path.length - b.path.length)[0]?.path;
  }

  const movementOptions = useMemo(() => {
    if (!selectedUnit || !canPlan || selectedUnit.faction !== state.activePlanner) {
      return [];
    }
    if (planningMode !== "move" && planningMode !== "moveAttack" && !dragState) {
      return [];
    }
    const options = getMovementOptions(selectedUnit, state, map);
    if (planningMode === "moveAttack") {
      const movementBudget = getEffectiveMovement(selectedUnit, state.turn);
      return options.filter((option) => option.cost < movementBudget);
    }
    return options;
  }, [canPlan, dragState, map, planningMode, selectedUnit, state]);

  const validMoveTiles = movementOptions.map((option) => option.position);

  const simulatedUnitForAttack: Unit | undefined = selectedUnit
    ? {
        ...selectedUnit,
        position: activePath[activePath.length - 1] ?? selectedUnit.position,
      }
    : undefined;

  const validTargets = useMemo(() => {
    if (!selectedUnit || !simulatedUnitForAttack || !canPlan || selectedUnit.faction !== state.activePlanner) {
      return [];
    }
    if (planningMode === "ability") {
      return getAbilityTargets(selectedUnit, state, map);
    }
    return [];
  }, [canPlan, map, planningMode, selectedUnit, simulatedUnitForAttack, state]);

  useEffect(() => {
    if (!dragState) {
      return undefined;
    }

    document.body.classList.add("draggingUnit");

    function handlePointerMove(event: PointerEvent) {
      const currentDrag = dragRef.current;
      if (!currentDrag) {
        return;
      }
      const movedDistance = Math.hypot(event.clientX - currentDrag.startX, event.clientY - currentDrag.startY);
      updateDrag({
        ...currentDrag,
        x: event.clientX,
        y: event.clientY,
        hasMoved: currentDrag.hasMoved || movedDistance > 10,
        target: coordFromPointer(event.clientX, event.clientY),
      });
    }

    function handlePointerUp(event: PointerEvent) {
      const currentDrag = dragRef.current;
      if (!currentDrag) {
        return;
      }
      finishDrag({
        ...currentDrag,
        x: event.clientX,
        y: event.clientY,
        target: coordFromPointer(event.clientX, event.clientY),
      });
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp, { passive: false });
    window.addEventListener("pointercancel", handlePointerUp, { passive: false });

    return () => {
      document.body.classList.remove("draggingUnit");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [dragState?.unitId, map, state]);

  function setOrder(unit: Unit, order: PlannedOrder) {
    onStateChange({
      ...state,
      plannedOrders: {
        ...state.plannedOrders,
        [unit.faction]: {
          ...state.plannedOrders[unit.faction],
          [unit.id]: order,
        },
      },
    });
    setNotice(`${unit.name}: ${order.label}`);
  }

  function clearOrder(unit: Unit) {
    const nextFactionOrders = { ...state.plannedOrders[unit.faction] };
    delete nextFactionOrders[unit.id];
    onStateChange({
      ...state,
      plannedOrders: {
        ...state.plannedOrders,
        [unit.faction]: nextFactionOrders,
      },
    });
    setPendingPath([]);
    setNotice(`Orden de ${unit.name} cancelada.`);
  }

  function handleUnitClick(unitId: string) {
    const unit = state.units.find((candidate) => candidate.id === unitId);
    setSelectedUnitId(unitId);
    setPendingPath([]);
    setPlanningMode(unit && canPlan && unit.faction === state.activePlanner ? "move" : "inspect");
    setNotice("");
  }

  function handleUnitDragStart(unitId: string, event: ReactPointerEvent<HTMLButtonElement>) {
    const unit = state.units.find((candidate) => candidate.id === unitId && candidate.alive);
    if (!unit || !canPlan || unit.faction !== state.activePlanner) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setSelectedUnitId(unitId);
    setPendingPath([]);
    setPlanningMode("move");
    updateDrag({
      unitId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      hasMoved: false,
      target: coordFromPointer(event.clientX, event.clientY),
    });
  }

  function finishDrag(currentDrag: DragState) {
    updateDrag(null);
    if (!currentDrag.hasMoved) {
      return;
    }

    const unit = state.units.find((candidate) => candidate.id === currentDrag.unitId && candidate.alive);
    if (!unit || !canPlan || unit.faction !== state.activePlanner) {
      return;
    }

    const destination = currentDrag.target;
    if (!destination) {
      setNotice("Suelta la ficha sobre una casilla o un enemigo.");
      setPlanningMode("move");
      return;
    }

    const attackTarget = enemyTargetAt(unit, destination);
    if (attackTarget) {
      const directAttack = getValidAttackTargets(unit, state, map, unit.position).find((candidate) => targetMatches(candidate, attackTarget));
      if (directAttack) {
        setSelectedUnitId(unit.id);
        setPendingPath([]);
        setPlanningMode("move");
        setOrder(unit, createOrder(unit, "attack", [], directAttack, state));
        return;
      }

      const moveAttackPath = findMoveAttackPath(unit, attackTarget);
      if (moveAttackPath) {
        setSelectedUnitId(unit.id);
        setPendingPath(moveAttackPath);
        setPlanningMode("move");
        setOrder(unit, createOrder(unit, "moveAttack", moveAttackPath, attackTarget, state));
        return;
      }

      setNotice("No hay ruta válida para atacar a ese objetivo.");
      setPlanningMode("move");
      return;
    }

    const option = destination
      ? getMovementOptions(unit, state, map).find((candidate) => sameCoord(candidate.position, destination))
      : undefined;

    if (!option) {
      setNotice("Suelta sobre una casilla azul o sobre un enemigo válido.");
      setPlanningMode("move");
      return;
    }

    setSelectedUnitId(unit.id);
    setPendingPath(option.path);
    setPlanningMode("move");
    setOrder(unit, createOrder(unit, "move", option.path, undefined, state));
  }

  function handleTileClick(coord: Coord) {
    if (!selectedUnit || !canPlan || selectedUnit.faction !== state.activePlanner) {
      return;
    }

    if (planningMode === "move" || planningMode === "moveAttack") {
      const option = movementOptions.find((candidate) => sameCoord(candidate.position, coord));
      if (!option) {
        setNotice("Esa casilla no es un destino válido.");
        return;
      }

      if (planningMode === "move") {
        setOrder(selectedUnit, createOrder(selectedUnit, "move", option.path, undefined, state));
        setPendingPath(option.path);
        return;
      }

      setPendingPath(option.path);
      setPlanningMode("attack");
      setNotice("Elige un objetivo para mover y atacar.");
    }
  }

  function handleTarget(target: AttackTarget) {
    if (!selectedUnit || !canPlan || selectedUnit.faction !== state.activePlanner) {
      return;
    }
    const validTarget = validTargets.find((candidate) => {
      if (candidate.kind !== target.kind) {
        return false;
      }
      return candidate.kind === "unit" ? target.kind === "unit" && candidate.unitId === target.unitId : target.kind === "base" && candidate.faction === target.faction;
    });

    if (!validTarget) {
      setNotice("Ese objetivo no es válido.");
      return;
    }

    const path = planningMode === "ability" ? [] : planningMode === "moveAttack" || activePath.length > 0 ? activePath : [];
    const type = path.length > 0 && planningMode !== "ability" ? "moveAttack" : planningMode === "ability" ? "ability" : "attack";
    const moveCost = getPathCost(path, map);
    if (type === "moveAttack" && moveCost >= getEffectiveMovement(selectedUnit, state.turn)) {
      setNotice("Si una unidad usa todo su movimiento, no puede atacar.");
      return;
    }
    setOrder(selectedUnit, createOrder(selectedUnit, type, path, validTarget, state));
    setPlanningMode("inspect");
  }

  function handleReady() {
    if (!state.activePlanner) {
      return;
    }

    const faction = state.activePlanner;
    const completedOrders = withReadyOrders(state, faction);

    if (state.mode === "hotseat" && faction === "humans") {
      onStateChange({
        ...state,
        phase: "handoff",
        activePlanner: "zombies",
        plannedOrders: completedOrders,
        combatLog: [`Humanos listos. Pasa el dispositivo a Zombis.`, ...state.combatLog].slice(0, 120),
      });
      setSelectedUnitId(undefined);
      setPendingPath([]);
      setPlanningMode("move");
      return;
    }

    const stateWithOrders = {
      ...state,
      plannedOrders: completedOrders,
    };

    const finalState =
      state.mode === "ai"
        ? {
            ...stateWithOrders,
            plannedOrders: {
              ...stateWithOrders.plannedOrders,
              zombies: generateAiOrders(stateWithOrders, map, "zombies"),
            },
          }
        : stateWithOrders;

    const resolved = resolveTurn(finalState, map);
    onStateChange(resolved);
    setSelectedUnitId(resolved.units.find((unit) => unit.faction === resolved.activePlanner)?.id);
    setPendingPath([]);
    setPlanningMode("move");
    setNotice("");
  }

  function beginZombiePlanning() {
    onStateChange({
      ...state,
      phase: "planning",
      combatLog: [`Zombis empiezan a planear.`, ...state.combatLog].slice(0, 120),
    });
    setSelectedUnitId(state.units.find((unit) => unit.faction === "zombies")?.id);
  }

  const activeOrders = state.activePlanner ? state.plannedOrders[state.activePlanner] : {};
  const livingActiveUnits = state.activePlanner ? state.units.filter((unit) => unit.alive && unit.faction === state.activePlanner) : [];
  const plannedCount = livingActiveUnits.filter((unit) => activeOrders[unit.id]).length;

  if (state.phase === "handoff") {
    return (
      <main className="handoffScreen">
        <section className="handoffPanel">
          <p className="eyebrow">Privacidad local</p>
          <h1>Pasa a Zombis</h1>
          <p>Las órdenes humanas están guardadas. El tablero queda oculto hasta que el jugador zombi empiece su planificación.</p>
          <button className="primaryButton" onClick={beginZombiePlanning}>
            Empezar planificación zombi
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="gameScreen">
      <header className="gameHeader">
        <div>
          <p className="eyebrow">Turno {state.turn}</p>
          <h1>{state.phase === "gameOver" ? "Fin de partida" : `${factionLabel(state.activePlanner)} planean`}</h1>
        </div>
        <div className="baseMeters">
          <div className="baseMeter humans">
            <span>Base humana</span>
            <strong>
              {state.bases.humans.hp}/{state.bases.humans.maxHp}
            </strong>
          </div>
          <div className="baseMeter zombies">
            <span>Base zombi</span>
            <strong>
              {state.bases.zombies.hp}/{state.bases.zombies.maxHp}
            </strong>
          </div>
        </div>
        <button className="secondaryButton" onClick={onExit}>
          Salir
        </button>
      </header>

      {state.phase === "gameOver" ? (
        <section className="victoryBanner">
          <h2>{state.winner === "draw" ? "Empate" : `Ganan ${factionLabel(state.winner)}`}</h2>
          <p>{state.victoryReason}</p>
        </section>
      ) : null}

      <section className="gameLayout">
        <Board
          map={map}
          state={state}
          selectedUnitId={selectedUnitId}
          validMoveTiles={validMoveTiles}
          validTargets={validTargets}
          pendingPath={activePath}
          dragTarget={dragState?.target}
          onTileClick={handleTileClick}
          onUnitClick={handleUnitClick}
          onUnitDragStart={handleUnitDragStart}
          onBaseClick={handleTarget}
          onTargetClick={handleTarget}
        />

        <aside className="sideColumn">
          <section className="panel phasePanel">
            <div className="phaseRow">
              <div>
                <span className="statLabel">Fase</span>
                <strong>{state.phase === "planning" ? "Plan" : state.phase === "gameOver" ? "Fin" : state.phase}</strong>
              </div>
              <div>
                <span className="statLabel">Órdenes</span>
                <strong>
                  {plannedCount}/{livingActiveUnits.length}
                </strong>
              </div>
            </div>
            <p className="notice">{notice || "Arrastra a azul para mover. Arrastra sobre enemigo para atacar. Pulsa Habilidad para usar una habilidad."}</p>
            {state.phase !== "gameOver" ? (
              <button className="primaryButton fullWidth" onClick={handleReady}>
                Listo
              </button>
            ) : null}
          </section>

          <UnitPanel
            unit={selectedUnit}
            state={state}
            map={map}
            currentFaction={state.activePlanner}
            order={selectedOrder}
            canPlan={canPlan}
            mode={planningMode}
            onSetMode={(mode) => {
              setPlanningMode(mode);
              setNotice("Toca un objetivo válido para usar la habilidad.");
            }}
          />

          <section className="panel plannedOrders">
            <h2>Órdenes</h2>
            {livingActiveUnits.length === 0 ? <p className="muted">No hay unidades vivas de este bando.</p> : null}
            <ol>
              {livingActiveUnits.map((unit) => (
                <li key={unit.id}>
                  <button onClick={() => handleUnitClick(unit.id)}>
                    <span>{unit.name}</span>
                    <small>{activeOrders[unit.id] ? orderSummary(activeOrders[unit.id], state) : "Sin orden"}</small>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </section>

      <CombatLog entries={state.combatLog} />
      {dragState ? (
        <div
          className={`dragGhost ${state.units.find((unit) => unit.id === dragState.unitId)?.faction ?? ""}`}
          style={{ transform: `translate(${dragState.x}px, ${dragState.y}px) translate(-50%, -50%)` }}
        >
          {unitInitials(state.units.find((unit) => unit.id === dragState.unitId)?.name ?? "")}
        </div>
      ) : null}
    </main>
  );
}
