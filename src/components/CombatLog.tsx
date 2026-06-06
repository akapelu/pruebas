interface CombatLogProps {
  entries: string[];
}

export default function CombatLog({ entries }: CombatLogProps) {
  return (
    <section className="panel combatLog">
      <h2>Registro</h2>
      <ol>
        {entries.map((entry, index) => (
          <li key={`${entry}-${index}`}>{entry}</li>
        ))}
      </ol>
    </section>
  );
}
