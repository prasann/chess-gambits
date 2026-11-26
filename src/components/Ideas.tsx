import type { Gambit } from '../domain/gambit'

const titles: Record<keyof Gambit['ideas'], string> = {
  idea: 'The big idea', structure: 'Understand the pawns', pieces: 'Give your pieces a job',
  motifs: 'Patterns worth noticing', declined: 'If they decline', caution: 'Keep it honest',
}
export function Ideas({ gambit, compact = false }: { gambit: Gambit; compact?: boolean }) {
  return <div className={compact ? 'ideas compact' : 'ideas'}>
    {Object.entries(gambit.ideas).map(([key, text]) => <section key={key}>
      <h3>{titles[key as keyof typeof titles]}</h3><p>{text}</p>
    </section>)}
  </div>
}
