import type { GameMap, Unit } from "../types/game";
import { getTerrain } from "./movement";

export interface DamageOptions {
  ignoreCover?: boolean;
  movedTiles?: number;
  source?: string;
}

export interface DamageResult {
  unit: Unit;
  finalDamage: number;
  notes: string[];
}

export function getAttackValue(attacker: Unit, movedTiles = 0): { damage: number; notes: string[] } {
  let damage = attacker.attack;
  const notes: string[] = [];

  if (attacker.abilityKey === "charge" && movedTiles >= 3) {
    damage += 1;
    notes.push("Carga +1");
  }

  if (attacker.abilityKey === "frenzy" && attacker.hp < attacker.maxHp / 2) {
    damage += 2;
    notes.push("Frenesí +2");
  }

  return { damage, notes };
}

export function applyDamage(unit: Unit, rawDamage: number, map: GameMap, options: DamageOptions = {}): DamageResult {
  let finalDamage = rawDamage;
  const notes: string[] = [];
  const terrain = getTerrain(map, unit.position);

  if (!options.ignoreCover && terrain === "cover") {
    finalDamage = Math.max(0, finalDamage - 1);
    notes.push("cobertura -1");
  }

  if (unit.abilityKey === "thickSkin") {
    finalDamage = Math.max(0, finalDamage - 1);
    notes.push("Piel Gruesa -1");
  }

  const hp = Math.max(0, unit.hp - finalDamage);
  return {
    unit: {
      ...unit,
      hp,
      alive: hp > 0,
    },
    finalDamage,
    notes,
  };
}

export function healUnit(unit: Unit, amount: number): { unit: Unit; healed: number } {
  if (!unit.alive) {
    return { unit, healed: 0 };
  }
  const nextHp = Math.min(unit.maxHp, unit.hp + amount);
  return {
    unit: {
      ...unit,
      hp: nextHp,
    },
    healed: nextHp - unit.hp,
  };
}
