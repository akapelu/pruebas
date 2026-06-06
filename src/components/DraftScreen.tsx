import { unitCatalog } from "../data/units";
import { canAddUnit, getTeamCost, MAX_TEAM_SIZE, RECRUITMENT_POINTS } from "../logic/draft";
import type { Faction } from "../types/game";

interface DraftScreenProps {
  faction: Faction;
  selectedTeam: string[];
  onAdd: (templateId: string) => void;
  onRemove: (index: number) => void;
  onConfirm: () => void;
  onBack: () => void;
}

export default function DraftScreen({ faction, selectedTeam, onAdd, onRemove, onConfirm, onBack }: DraftScreenProps) {
  const remaining = RECRUITMENT_POINTS - getTeamCost(selectedTeam);
  const factionName = faction === "humans" ? "Humanos" : "Zombis";

  return (
    <main className="screenStack">
      <header className="screenHeader">
        <div>
          <p className="eyebrow">Reclutamiento</p>
          <h1>Recluta {factionName}</h1>
        </div>
        <button className="secondaryButton" onClick={onBack}>
          Atrás
        </button>
      </header>

      <section className="draftSummary">
        <div>
          <span className="statLabel">Puntos</span>
          <strong>{remaining}</strong>
        </div>
        <div>
          <span className="statLabel">Escuadra</span>
          <strong>
            {selectedTeam.length}/{MAX_TEAM_SIZE}
          </strong>
        </div>
        <button className="primaryButton" disabled={selectedTeam.length === 0} onClick={onConfirm}>
          Confirmar {factionName}
        </button>
      </section>

      <section className="draftLayout">
        <div className="unitDraftGrid">
          {unitCatalog[faction].map((unit) => (
            <article className={`unitCard ${faction}`} key={unit.templateId}>
              <div className="unitCardHeader">
                <h2>{unit.name}</h2>
                <span className="costPip">{unit.cost}</span>
              </div>
              <dl className="statsGrid">
                <div>
                  <dt>HP</dt>
                  <dd>{unit.hp}</dd>
                </div>
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
                  <dd>{unit.movement}</dd>
                </div>
              </dl>
              <p className="abilityText">
                <strong>{unit.abilityName}:</strong> {unit.abilityDescription}
              </p>
              <button className="secondaryButton" disabled={!canAddUnit(selectedTeam, unit.templateId)} onClick={() => onAdd(unit.templateId)}>
                Añadir
              </button>
            </article>
          ))}
        </div>

        <aside className="selectedRoster">
          <h2>Equipo elegido</h2>
          {selectedTeam.length === 0 ? <p className="muted">No has elegido unidades.</p> : null}
          <ol>
            {selectedTeam.map((templateId, index) => {
              const unit = unitCatalog[faction].find((candidate) => candidate.templateId === templateId);
              return (
                <li key={`${templateId}-${index}`}>
                  <span>{unit?.name ?? templateId}</span>
                  <button className="iconButton" aria-label={`Quitar ${unit?.name ?? templateId}`} onClick={() => onRemove(index)}>
                    ×
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>
      </section>
    </main>
  );
}
