import type { Faction, UnitTemplate } from "../types/game";

export const humanUnits: UnitTemplate[] = [
  {
    templateId: "soldier",
    name: "Soldado",
    faction: "humans",
    hp: 6,
    attack: 2,
    range: 3,
    movement: 3,
    cost: 2,
    abilityName: "Fuego de Supresión",
    abilityDescription: "El enemigo objetivo pierde 1 de movimiento el próximo turno.",
    abilityKey: "suppressiveFire",
  },
  {
    templateId: "sniper",
    name: "Francotirador",
    faction: "humans",
    hp: 4,
    attack: 4,
    range: 6,
    movement: 2,
    cost: 4,
    abilityName: "Disparo Preciso",
    abilityDescription: "Daña a un objetivo ignorando la cobertura.",
    abilityKey: "preciseShot",
  },
  {
    templateId: "grenadier",
    name: "Granadero",
    faction: "humans",
    hp: 5,
    attack: 3,
    range: 4,
    movement: 2,
    cost: 3,
    abilityName: "Explosión",
    abilityDescription: "Daña al objetivo y a enemigos adyacentes por 2 de daño.",
    abilityKey: "blast",
  },
  {
    templateId: "medic",
    name: "Médico",
    faction: "humans",
    hp: 5,
    attack: 1,
    range: 2,
    movement: 3,
    cost: 3,
    abilityName: "Curar",
    abilityDescription: "Cura 2 PV a una unidad aliada a alcance 3.",
    abilityKey: "heal",
  },
];

export const zombieUnits: UnitTemplate[] = [
  {
    templateId: "runner",
    name: "Corredor",
    faction: "zombies",
    hp: 4,
    attack: 2,
    range: 1,
    movement: 5,
    cost: 2,
    abilityName: "Carga",
    abilityDescription: "Si se movió al menos 3 casillas este turno, hace +1 de daño.",
    abilityKey: "charge",
  },
  {
    templateId: "tank-zombie",
    name: "Zombi Tanque",
    faction: "zombies",
    hp: 10,
    attack: 3,
    range: 1,
    movement: 2,
    cost: 5,
    abilityName: "Piel Gruesa",
    abilityDescription: "Reduce todo el daño recibido en 1.",
    abilityKey: "thickSkin",
  },
  {
    templateId: "spitter",
    name: "Escupidor",
    faction: "zombies",
    hp: 5,
    attack: 2,
    range: 4,
    movement: 3,
    cost: 3,
    abilityName: "Escupitajo Ácido",
    abilityDescription: "Daña y envenena a un objetivo. El veneno hace 1 de daño el próximo turno.",
    abilityKey: "acidSpit",
  },
  {
    templateId: "mutant",
    name: "Mutante",
    faction: "zombies",
    hp: 7,
    attack: 4,
    range: 1,
    movement: 3,
    cost: 4,
    abilityName: "Frenesí",
    abilityDescription: "Gana +2 de ataque cuando está por debajo de la mitad de PV.",
    abilityKey: "frenzy",
  },
];

export const unitCatalog: Record<Faction, UnitTemplate[]> = {
  humans: humanUnits,
  zombies: zombieUnits,
};

export function getTemplate(templateId: string): UnitTemplate {
  const template = [...humanUnits, ...zombieUnits].find((unit) => unit.templateId === templateId);
  if (!template) {
    throw new Error(`Plantilla de unidad desconocida: ${templateId}`);
  }
  return template;
}
