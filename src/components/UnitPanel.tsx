import type { Faction, GameMap, GameState, PlannedOrder, Unit } from "../types/game";
import { getEffectiveMovement } from "../logic/movement";

interface UnitPanelProps {
  unit?: Unit;
  state: GameState;
  map: GameMap;
  currentFaction: Faction | null;
  order?: PlannedOrder;
  canPlan: boolean;
  mode: string;
  onSetMode: (mode: "ability") => void;
}

function factionName(faction: Faction): string {
  return faction === "humans" ? "Humanos" : "Zombis";
}

export default function UnitPanel({ unit, state, currentFaction, order, canPlan, mode, onSetMode }: UnitPanelProps) {
  if (!unit) {
    return (
      <section className="panel unitPanel">
        <h2>Unidad</h2>
        <p className="muted">Toca o arrastra una unidad de tu bando.</p>
      </section>
    );
  }

  const isPlannerUnit = canPlan && unit.faction === currentFaction;
  const activeSuppression = unit.statusEffects.some((effect) => effect.type === "suppressed" && effect.expiresOnTurn >= state.turn);
  const activePoison = unit.statusEffects.some((effect) => effect.type === "poisoned");

  return (
    <section className={`panel unitPanel ${unit.faction}`}>
      <div className="unitPanelHeader">
        <div>
          <p className="eyebrow">{factionName(unit.faction)}</p>
          <h2>{unit.name}</h2>
        </div>
        <strong>
          {unit.hp}/{unit.maxHp} PV
        </strong>
      </div>
      <div className="hpBar" aria-label={`${unit.hp} de ${unit.maxHp} PV`}>
        <span style={{ width: `${(unit.hp / unit.maxHp) * 100}%` }} />
      </div>
      <dl className="statsGrid">
        <div>
          <dt>Atq</dt>
          <dd>{unit.attack}</dd>
        </div>
        <div>
          <dt>Alc</dt>
          <dd>{unit.range}</dd>
        </div>
        <div>
          <dt>Mov</dt>
          <dd>{getEffectiveMovement(unit, state.turn)}</dd>
        </div>
        <div>
          <dt>Coste</dt>
          <dd>{unit.cost}</dd>
        </div>
      </dl>
      <p className="abilityText">
        <strong>{unit.abilityName}:</strong> {unit.abilityDescription}
      </p>
      <div className="statusRow">
        {activeSuppression ? <span>Suprimido</span> : null}
        {activePoison ? <span>Envenenado</span> : null}
        {!activeSuppression && !activePoison ? <span>Sin estado</span> : null}
      </div>
      <div className="orderBox">
        <span className="statLabel">Orden</span>
        <strong>{order?.label ?? "Sin orden"}</strong>
      </div>
      {isPlannerUnit ? (
        <div className="orderControls">
          <button className={mode === "ability" ? "activeControl" : ""} onClick={() => onSetMode("ability")}>
            Habilidad
          </button>
        </div>
      ) : (
        <p className="muted">Esta unidad no pertenece al jugador activo.</p>
      )}
    </section>
  );
}
