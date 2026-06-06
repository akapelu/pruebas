import type { GameMap, TerrainType } from "../types/game";

interface MapSelectionProps {
  maps: GameMap[];
  onSelect: (mapId: string) => void;
  onBack: () => void;
}

const terrainShort: Record<TerrainType, string> = {
  normal: "",
  wall: "■",
  cover: "▣",
  difficult: "⌁",
  grass: "≋",
};

export default function MapSelection({ maps, onSelect, onBack }: MapSelectionProps) {
  return (
    <main className="screenStack">
      <header className="screenHeader">
        <div>
          <p className="eyebrow">Elige campo de batalla</p>
          <h1>Selección de mapa</h1>
        </div>
        <button className="secondaryButton" onClick={onBack}>
          Atrás
        </button>
      </header>
      <section className="mapGrid">
        {maps.map((map) => (
          <article className="mapCard" key={map.id}>
            <div className="miniMap" aria-label={`Vista previa de terreno: ${map.name}`}>
              {map.terrain.flatMap((row, y) =>
                row.map((terrain, x) => (
                  <span className={`miniTile terrain-${terrain}`} key={`${x}-${y}`}>
                    {terrainShort[terrain]}
                  </span>
                )),
              )}
            </div>
            <h2>{map.name}</h2>
            <p>{map.description}</p>
            <button className="primaryButton" onClick={() => onSelect(map.id)}>
              Elegir mapa
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
