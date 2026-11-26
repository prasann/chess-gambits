import type { Gambit } from '../domain/gambit'

export const ideaTitles: Record<keyof Gambit['ideas'], string> = {
  idea: 'The big idea', structure: 'Understand the pawns', pieces: 'Give your pieces a job',
  motifs: 'Patterns worth noticing', declined: 'If they decline', caution: 'Keep it honest',
}
export function Ideas({ gambit, compact = false }: { gambit: Gambit; compact?: boolean }) {
  return <div className={compact ? 'ideas compact' : 'ideas'}>
    {Object.entries(gambit.ideas).map(([key, text]) => <section key={key} id={compact ? undefined : `idea-${key}`}>
      <h3>{ideaTitles[key as keyof typeof ideaTitles]}</h3><p>{text}</p>
    </section>)}
  </div>
}
