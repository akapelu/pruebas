import type { Coord, TerrainType } from "../types/game";

interface TileProps {
  coord: Coord;
  terrain: TerrainType;
  highlighted: boolean;
  attackable: boolean;
  selected: boolean;
  plannedPath: boolean;
  dropTarget: boolean;
  children: React.ReactNode;
  onClick: () => void;
}

const terrainMark: Record<TerrainType, string> = {
  normal: "",
  wall: "■",
  cover: "▣",
  difficult: "⌁",
  grass: "≋",
};

const terrainLabel: Record<TerrainType, string> = {
  normal: "normal",
  wall: "muro",
  cover: "cobertura",
  difficult: "terreno difícil",
  grass: "hierba alta",
};

export default function Tile({ coord, terrain, highlighted, attackable, selected, plannedPath, dropTarget, children, onClick }: TileProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={`tile terrain-${terrain} ${highlighted ? "moveTarget" : ""} ${attackable ? "attackTarget" : ""} ${selected ? "selectedTile" : ""} ${plannedPath ? "plannedPath" : ""} ${dropTarget ? "dropTarget" : ""}`}
      data-x={coord.x}
      data-y={coord.y}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      aria-label={`Casilla ${coord.x}, ${coord.y}, ${terrainLabel[terrain]}`}
    >
      <span className="terrainMark">{terrainMark[terrain]}</span>
      {children}
      <span className="coordLabel">
        {coord.x},{coord.y}
      </span>
    </div>
  );
}
