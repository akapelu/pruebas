import type { PointerEvent as ReactPointerEvent } from "react";
import type { Unit } from "../types/game";

interface UnitTokenProps {
  unit: Unit;
  selected: boolean;
  planned: boolean;
  canDrag: boolean;
  onClick: () => void;
  onDragStart: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}

export function unitInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

export default function UnitToken({ unit, selected, planned, canDrag, onClick, onDragStart }: UnitTokenProps) {
  return (
    <button
      className={`unitToken ${unit.faction} ${selected ? "selected" : ""} ${planned ? "planned" : ""} ${canDrag ? "draggableUnit" : ""}`}
      onPointerDown={(event) => {
        if (canDrag) {
          onDragStart(event);
        }
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      title={`${unit.name} ${unit.hp}/${unit.maxHp} PV`}
    >
      <span>{unitInitials(unit.name)}</span>
      <span className="tinyHp">
        {unit.hp}/{unit.maxHp}
      </span>
    </button>
  );
}
