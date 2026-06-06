interface RulesScreenProps {
  onBack: () => void;
  showCredits?: boolean;
}

export default function RulesScreen({ onBack, showCredits = false }: RulesScreenProps) {
  return (
    <main className="screenStack">
      <header className="screenHeader">
        <div>
          <p className="eyebrow">{showCredits ? "Notas del proyecto" : "Referencia"}</p>
          <h1>{showCredits ? "Créditos" : "Reglas"}</h1>
        </div>
        <button className="secondaryButton" onClick={onBack}>
          Atrás
        </button>
      </header>

      {showCredits ? (
        <section className="rulesPanel">
          <h2>Dead Grid: Tactical Assault</h2>
          <p>Prototipo táctico creado con React, TypeScript, Vite y CSS.</p>
          <p>Esta versión no usa servicios de pago, backend, cuentas, ranking, matchmaking ni multijugador online.</p>
        </section>
      ) : (
        <section className="rulesPanel">
          <h2>Objetivo</h2>
          <p>Destruye la base enemiga antes de que tu base llegue a 0 PV. Las unidades importan, pero la base decide la partida.</p>

          <h2>Turnos simultáneos</h2>
          <p>Cada bando asigna órdenes en secreto. Cuando ambos están listos, movimiento, ataques, habilidades y daño a bases se resuelven en un orden fijo.</p>

          <h2>Movimiento y ataques</h2>
          <p>Arrastra una ficha a una casilla vacía para mover. Arrástrala sobre un enemigo para atacar. Si usa todo su movimiento, no puede atacar ese turno.</p>

          <h2>Terreno</h2>
          <p>Los muros bloquean el paso. La cobertura reduce el daño recibido en 1. El terreno difícil cuesta 2 de movimiento. La hierba alta impide ataques desde más de 2 casillas.</p>

          <h2>Habilidades</h2>
          <p>Pulsa Habilidad y toca un objetivo válido. Algunas habilidades dañan, otras curan o aplican estados.</p>

          <h2>Victoria</h2>
          <p>Si ambas bases caen en el mismo turno, hay empate. En el turno 15 gana la base con más PV; si están empatadas, la partida es empate.</p>
        </section>
      )}
    </main>
  );
}
