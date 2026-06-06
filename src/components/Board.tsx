import type { PointerEvent as ReactPointerEvent } from "react";
import type { AttackTarget, Coord, GameMap, GameState, Unit } from "../types/game";
import { coordKey, getBaseAt, sameCoord } from "../logic/movement";
import Tile from "./Tile";
import UnitToken from "./UnitToken";

interface BoardProps {
  map: GameMap;
  state: GameState;
  selectedUnitId?: string;
  validMoveTiles: Coord[];
  validTargets: AttackTarget[];
  pendingPath: Coord[];
  dragTarget?: Coord;
  onTileClick: (coord: Coord) => void;
  onUnitClick: (unitId: string) => void;
  onUnitDragStart: (unitId: string, event: ReactPointerEvent<HTMLButtonElement>) => void;
  onBaseClick: (target: AttackTarget) => void;
  onTargetClick: (target: AttackTarget) => void;
}

function unitAt(units: Unit[], coord: Coord): Unit | undefined {
  return units.find((unit) => unit.alive && sameCoord(unit.position, coord));
}

function isTargetCoord(targets: AttackTarget[], coord: Coord): boolean {
  return targets.some((target) => sameCoord(target.position, coord));
}

export default function Board({
  map,
  state,
  selectedUnitId,
  validMoveTiles,
  validTargets,
  pendingPath,
  dragTarget,
  onTileClick,
  onUnitClick,
  onUnitDragStart,
  onBaseClick,
  onTargetClick,
}: BoardProps) {
  const moveKeys = new Set(validMoveTiles.map(coordKey));
  const pathKeys = new Set(pendingPath.map(coordKey));
  const dragKey = dragTarget ? coordKey(dragTarget) : "";

  return (
    <div className="boardShell">
      <div className="board" role="grid" aria-label="Campo de batalla Dead Grid">
        {map.terrain.flatMap((row, y) =>
          row.map((terrain, x) => {
            const coord = { x, y };
            const unit = unitAt(state.units, coord);
            const base = getBaseAt(state, coord);
            const baseTarget = base
              ? validTargets.find((target) => target.kind === "base" && target.faction === base.faction)
              : undefined;
            const unitTarget = unit
              ? validTargets.find((target) => target.kind === "unit" && target.unitId === unit.id)
              : undefined;
            return (
              <Tile
                key={`${x}-${y}`}
                coord={coord}
                terrain={terrain}
                highlighted={moveKeys.has(coordKey(coord))}
                attackable={isTargetCoord(validTargets, coord)}
                selected={!!unit && unit.id === selectedUnitId}
                plannedPath={pathKeys.has(coordKey(coord))}
                dropTarget={dragKey === coordKey(coord)}
                onClick={() => onTileClick(coord)}
              >
                {base ? (
                  <button
                    className={`baseToken ${base.faction}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (baseTarget) {
                        onBaseClick(baseTarget);
                      }
                    }}
                    title={`Base ${base.faction === "humans" ? "humana" : "zombi"} ${base.hp}/${base.maxHp}`}
                  >
                    {base.faction === "humans" ? "HB" : "ZB"}
                  </button>
                ) : null}
                {unit ? (
                  <UnitToken
                    unit={unit}
                    selected={unit.id === selectedUnitId}
                    planned={!!state.plannedOrders[unit.faction][unit.id]}
                    canDrag={state.phase === "planning" && unit.faction === state.activePlanner && !unitTarget}
                    onClick={() => {
                      if (unitTarget) {
                        onTargetClick(unitTarget);
                      } else {
                        onUnitClick(unit.id);
                      }
                    }}
                    onDragStart={(event) => onUnitDragStart(unit.id, event)}
                  />
                ) : null}
              </Tile>
            );
          }),
        )}
      </div>
    </div>
  );
}
