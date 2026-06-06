export const BOARD_SIZE = 9;
export const TURN_LIMIT = 15;

export type Faction = "humans" | "zombies";
export type GameMode = "hotseat" | "ai";
export type TerrainType = "normal" | "wall" | "cover" | "difficult" | "grass";
export type GamePhase = "planning" | "handoff" | "resolution" | "gameOver";
export type Winner = Faction | "draw" | null;

export interface Coord {
  x: number;
  y: number;
}

export type AbilityKey =
  | "suppressiveFire"
  | "preciseShot"
  | "blast"
  | "heal"
  | "charge"
  | "thickSkin"
  | "acidSpit"
  | "frenzy";

export interface UnitTemplate {
  templateId: string;
  name: string;
  faction: Faction;
  hp: number;
  attack: number;
  range: number;
  movement: number;
  cost: number;
  abilityName: string;
  abilityDescription: string;
  abilityKey: AbilityKey;
}

export interface StatusEffect {
  type: "poisoned" | "suppressed";
  expiresOnTurn: number;
}

export interface Unit {
  id: string;
  templateId: string;
  name: string;
  faction: Faction;
  hp: number;
  maxHp: number;
  attack: number;
  range: number;
  movement: number;
  position: Coord;
  abilityName: string;
  abilityDescription: string;
  abilityKey: AbilityKey;
  cost: number;
  statusEffects: StatusEffect[];
  alive: boolean;
}

export interface Base {
  faction: Faction;
  position: Coord;
  hp: number;
  maxHp: number;
}

export interface GameMap {
  id: string;
  name: string;
  description: string;
  terrain: TerrainType[][];
}

export type AttackTarget =
  | {
      kind: "unit";
      unitId: string;
      faction: Faction;
      position: Coord;
    }
  | {
      kind: "base";
      faction: Faction;
      position: Coord;
    };

export type OrderType = "wait" | "move" | "attack" | "moveAttack" | "ability";

export interface PlannedOrder {
  unitId: string;
  faction: Faction;
  type: OrderType;
  path: Coord[];
  target?: AttackTarget;
  label: string;
}

export type FactionOrders = Record<string, PlannedOrder>;
export type PlannedOrders = Record<Faction, FactionOrders>;

export interface GameState {
  mode: GameMode;
  mapId: string;
  turn: number;
  phase: GamePhase;
  activePlanner: Faction | null;
  units: Unit[];
  bases: Record<Faction, Base>;
  plannedOrders: PlannedOrders;
  combatLog: string[];
  winner: Winner;
  victoryReason?: string;
}

export interface MovementOption {
  position: Coord;
  path: Coord[];
  cost: number;
}
