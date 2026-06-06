import type { GameMap, TerrainType } from "../types/game";

const terrainLegend: Record<string, TerrainType> = {
  N: "normal",
  W: "wall",
  C: "cover",
  D: "difficult",
  G: "grass",
};

function parseTerrain(rows: string[]): TerrainType[][] {
  return rows.map((row) =>
    row.split("").map((symbol) => {
      const terrain = terrainLegend[symbol];
      if (!terrain) {
        throw new Error(`Símbolo de terreno desconocido: ${symbol}`);
      }
      return terrain;
    }),
  );
}

export const maps: GameMap[] = [
  {
    id: "broken-streets",
    name: "Calles Rotas",
    description: "Mapa equilibrado con cobertura central, esquinas duras y pavimento agrietado.",
    terrain: parseTerrain([
      "NNNDNNCNN",
      "NWNDNNCWN",
      "NWNNCNNWN",
      "NNDCNCDNN",
      "CNNNWNNNC",
      "NNDCNCDNN",
      "NWNNCNNWN",
      "NWCNNDNWN",
      "NNCNNDNNN",
    ]),
  },
  {
    id: "overgrown-district",
    name: "Distrito Invadido",
    description: "Hierba alta y rutas abiertas que premian emboscadas a corta distancia.",
    terrain: parseTerrain([
      "NGNGNCGNN",
      "GGNGCNGGN",
      "NGDNNGDGN",
      "CNGGWGGNC",
      "NGDNCNDGN",
      "CNGGWGGNC",
      "NGDGNNDGN",
      "NGGNCGNGG",
      "NNGCNGNGN",
    ]),
  },
];

export function getMap(mapId: string): GameMap {
  const map = maps.find((candidate) => candidate.id === mapId);
  if (!map) {
    throw new Error(`Mapa desconocido: ${mapId}`);
  }
  return map;
}
