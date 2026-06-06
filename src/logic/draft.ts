import type { Faction, GameMap, GameMode, GameState, Unit } from "../types/game";
import { getTemplate } from "../data/units";
import { createEmptyOrders } from "./turnResolution";

export const RECRUITMENT_POINTS = 15;
export const MAX_TEAM_SIZE = 5;

const spawnPoints: Record<Faction, Array<{ x: number; y: number }>> = {
  humans: [
    { x: 2, y: 8 },
    { x: 0, y: 7 },
    { x: 1, y: 8 },
    { x: 0, y: 6 },
    { x: 3, y: 8 },
  ],
  zombies: [
    { x: 6, y: 0 },
    { x: 8, y: 1 },
    { x: 7, y: 0 },
    { x: 8, y: 2 },
    { x: 5, y: 0 },
  ],
};

export function getTeamCost(templateIds: string[]): number {
  return templateIds.reduce((total, templateId) => total + getTemplate(templateId).cost, 0);
}

export function canAddUnit(templateIds: string[], templateId: string): boolean {
  return templateIds.length < MAX_TEAM_SIZE && getTeamCost(templateIds) + getTemplate(templateId).cost <= RECRUITMENT_POINTS;
}

export function defaultAiTeam(): string[] {
  return ["tank-zombie", "mutant", "spitter", "runner"];
}

export function createUnitsForTeam(faction: Faction, templateIds: string[]): Unit[] {
  return templateIds.map((templateId, index) => {
    const template = getTemplate(templateId);
    const position = spawnPoints[faction][index] ?? spawnPoints[faction][spawnPoints[faction].length - 1];
    return {
      id: `${faction}-${template.templateId}-${index + 1}`,
      templateId: template.templateId,
      name: template.name,
      faction,
      hp: template.hp,
      maxHp: template.hp,
      attack: template.attack,
      range: template.range,
      movement: template.movement,
      position: { ...position },
      abilityName: template.abilityName,
      abilityDescription: template.abilityDescription,
      abilityKey: template.abilityKey,
      cost: template.cost,
      statusEffects: [],
      alive: true,
    };
  });
}

export function createInitialGame(mode: GameMode, map: GameMap, humanTeam: string[], zombieTeam: string[]): GameState {
  return {
    mode,
    mapId: map.id,
    turn: 1,
    phase: "planning",
    activePlanner: "humans",
    units: [...createUnitsForTeam("humans", humanTeam), ...createUnitsForTeam("zombies", zombieTeam)],
    bases: {
      humans: {
        faction: "humans",
        position: { x: 0, y: 8 },
        hp: 30,
        maxHp: 30,
      },
      zombies: {
        faction: "zombies",
        position: { x: 8, y: 0 },
        hp: 30,
        maxHp: 30,
      },
    },
    plannedOrders: createEmptyOrders(),
    combatLog: ["Empieza el turno 1. Humanos planean primero."],
    winner: null,
  };
}
