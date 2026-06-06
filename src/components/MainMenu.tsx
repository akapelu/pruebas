import type { GameMode } from "../types/game";

interface MainMenuProps {
  onStart: (mode: GameMode) => void;
  onRules: () => void;
  onCredits: () => void;
}

export default function MainMenu({ onStart, onRules, onCredits }: MainMenuProps) {
  return (
    <main className="menuScreen">
      <section className="titleBlock">
        <p className="eyebrow">Táctica por turnos simultáneos</p>
        <h1>Dead Grid: Asalto Táctico</h1>
        <p className="subtitle">Planea en secreto, revela a la vez y destruye la base enemiga antes de que caiga la tuya.</p>
      </section>
      <nav className="menuActions" aria-label="Menú principal">
        <button className="primaryButton" onClick={() => onStart("hotseat")}>
          Jugar local
        </button>
        <button className="primaryButton" onClick={() => onStart("ai")}>
          Jugar contra IA
        </button>
        <button className="secondaryButton" onClick={onRules}>
          Reglas
        </button>
        <button className="secondaryButton" onClick={onCredits}>
          Créditos
        </button>
      </nav>
    </main>
  );
}
