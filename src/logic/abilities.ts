import type { AttackTarget, Base, GameMap, GameState, PlannedOrder, Unit } from "../types/game";
import { applyDamage, getAttackValue, healUnit } from "./combat";
import { getValidAttackTargets, manhattanDistance } from "./movement";

export interface AbilityResolution {
  units: Unit[];
  bases: Record<"humans" | "zombies", Base>;
  logs: string[];
}

function replaceUnit(units: Unit[], nextUnit: Unit): Unit[] {
  return units.map((unit) => (unit.id === nextUnit.id ? nextUnit : unit));
}

function findTargetUnit(units: Unit[], target?: AttackTarget): Unit | undefined {
  if (!target || target.kind !== "unit") {
    return undefined;
  }
  return units.find((unit) => unit.id === target.unitId && unit.alive);
}

export function getAbilityTargets(unit: Unit, state: GameState, map: GameMap): AttackTarget[] {
  if (unit.abilityKey === "heal") {
    return getValidAttackTargets(unit, state, map, unit.position, "ally", 3, false).filter((target) => {
      const ally = target.kind === "unit" ? state.units.find((candidate) => candidate.id === target.unitId) : undefined;
      return !!ally && ally.hp < ally.maxHp;
    });
  }

  if (unit.abilityKey === "thickSkin") {
    return [];
  }

  return getValidAttackTargets(unit, state, map, unit.position, "enemy", unit.range, false);
}

export function applyAbility(caster: Unit, order: PlannedOrder, units: Unit[], bases: Record<"humans" | "zombies", Base>, map: GameMap, turn: number): AbilityResolution {
  const logs: string[] = [];
  const targetUnit = findTargetUnit(units, order.target);

  switch (caster.abilityKey) {
    case "suppressiveFire": {
      if (!targetUnit) {
        logs.push(`${caster.name} no encontró objetivo válido para Fuego de Supresión.`);
        return { units, bases, logs };
      }
      const alreadySuppressed = targetUnit.statusEffects.some((effect) => effect.type === "suppressed" && effect.expiresOnTurn >= turn + 1);
      const nextTarget = {
        ...targetUnit,
        statusEffects: alreadySuppressed
          ? targetUnit.statusEffects
          : [...targetUnit.statusEffects, { type: "suppressed" as const, expiresOnTurn: turn + 1 }],
      };
      logs.push(`${caster.name} suprime a ${targetUnit.name}; pierde 1 de movimiento el próximo turno.`);
      return { units: replaceUnit(units, nextTarget), bases, logs };
    }

    case "preciseShot": {
      if (!targetUnit) {
        logs.push(`${caster.name} no encontró objetivo válido para Disparo Preciso.`);
        return { units, bases, logs };
      }
      const attack = getAttackValue(caster);
      const damage = applyDamage(targetUnit, attack.damage, map, { ignoreCover: true });
      logs.push(`${caster.name} usa Disparo Preciso contra ${targetUnit.name} por ${damage.finalDamage} de daño.`);
      return { units: replaceUnit(units, damage.unit), bases, logs };
    }

    case "blast": {
      if (!targetUnit) {
        logs.push(`${caster.name} no encontró objetivo válido para Explosión.`);
        return { units, bases, logs };
      }
      let nextUnits = units;
      const enemies = units.filter(
        (unit) => unit.alive && unit.faction !== caster.faction && manhattanDistance(unit.position, targetUnit.position) <= 1,
      );
      for (const enemy of enemies) {
        const current = nextUnits.find((unit) => unit.id === enemy.id);
        if (!current) {
          continue;
        }
        const damage = applyDamage(current, 2, map);
        nextUnits = replaceUnit(nextUnits, damage.unit);
        logs.push(`La Explosión de ${caster.name} golpea a ${current.name} por ${damage.finalDamage} de daño.`);
      }
      return { units: nextUnits, bases, logs };
    }

    case "heal": {
      if (!targetUnit || targetUnit.faction !== caster.faction) {
        logs.push(`${caster.name} no encontró aliado válido para Curar.`);
        return { units, bases, logs };
      }
      const healed = healUnit(targetUnit, 2);
      logs.push(`${caster.name} cura a ${targetUnit.name} por ${healed.healed} PV.`);
      return { units: replaceUnit(units, healed.unit), bases, logs };
    }

    case "acidSpit": {
      if (!targetUnit) {
        logs.push(`${caster.name} no encontró objetivo válido para Escupitajo Ácido.`);
        return { units, bases, logs };
      }
      const attack = getAttackValue(caster);
      const damage = applyDamage(targetUnit, attack.damage, map);
      const poisoned = damage.unit.alive
        ? {
            ...damage.unit,
            statusEffects: [
              ...damage.unit.statusEffects.filter((effect) => effect.type !== "poisoned"),
              { type: "poisoned" as const, expiresOnTurn: turn + 1 },
            ],
          }
        : damage.unit;
      logs.push(`${caster.name} escupe ácido a ${targetUnit.name} por ${damage.finalDamage} de daño y veneno.`);
      return { units: replaceUnit(units, poisoned), bases, logs };
    }

    case "charge":
    case "frenzy": {
      if (!targetUnit) {
        logs.push(`${caster.name} no encontró objetivo válido para ${caster.abilityName}.`);
        return { units, bases, logs };
      }
      const attack = getAttackValue(caster, caster.abilityKey === "charge" ? 3 : 0);
      const damage = applyDamage(targetUnit, attack.damage, map);
      logs.push(`${caster.name} usa ${caster.abilityName} contra ${targetUnit.name} por ${damage.finalDamage} de daño.`);
      return { units: replaceUnit(units, damage.unit), bases, logs };
    }

    case "thickSkin":
      logs.push(`${caster.name} mantiene la posición; Piel Gruesa siempre está activa.`);
      return { units, bases, logs };

    default:
      return { units, bases, logs };
  }
}
