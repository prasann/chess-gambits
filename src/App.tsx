import { useEffect, useState } from 'react'
import { Board } from './components/Board'
import { Ideas } from './components/Ideas'
import { gambits } from './gambits'
import { replay, type Gambit } from './domain/gambit'
import { pieceSets, setPieceSet, usePieceSet, type PieceSet } from './pieceSets'
import { Practice } from './features/practice/Practice'

function Mark({ small = false }: { small?: boolean }) {
  return <svg className={small ? 'brand-mark small' : 'brand-mark'} viewBox="0 0 40 40" aria-hidden="true">
    <path d="M8 32h25v-4H8zm4-6h19c0-9-3-15-12-17l-3-4v7L8 21l6 4 7-6-2 7z" />
  </svg>
}

function Library() {
  const [filter, setFilter] = useState('all')
  const shown = gambits.filter((gambit) => filter === 'all' || gambit.side === filter)
  return <main className="library-page page-width">
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow"><span className="tiny-diamond" /> A playground for purposeful chess</span>
        <h1>A pawn is a price.<br /><span>Make it worth paying.</span></h1>
        <p>Understand the idea behind the sacrifice. Then find your own moves against a partner that plays back.</p>
        <a className="primary-button" href="#library" onClick={(event) => {
          event.preventDefault()
          document.getElementById('library')?.scrollIntoView()
        }}>Find your gambit <span aria-hidden="true">↗</span></a>
        <div className="hero-proof"><span>5 opening repertoires</span><span>No account. Just chess.</span></div>
      </div>
      <div className="hero-visual" aria-hidden="true">
        <div className="visual-top"><span>THE ART OF GIVING SOMETHING UP</span><span>01 / 05</span></div>
        <div className="hero-board-wrap"><Board game={replay(['e4', 'e5', 'f4'])} side="white" /></div>
        <div className="visual-bottom"><span>King's Gambit</span><span>Initiative over material.</span></div>
      </div>
    </section>
    <section className="library-section" id="library">
      <div className="section-heading">
        <div><span className="eyebrow">The opening collection</span><h2>Choose your kind of imbalance.</h2></div>
        <div className="filter-tabs" role="group" aria-label="Filter by color">
          {['all', 'white', 'black'].map((value) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {value === 'all' ? 'All gambits' : `As ${value}`}
          </button>)}
        </div>
      </div>
      <div className="gambit-grid">
        {shown.map((gambit, index) => <GambitCard gambit={gambit} index={index} key={gambit.id} />)}
      </div>
      <p className="collection-note">Small repertoire. Deep practice. Every opening includes accepted and declined ideas.</p>
    </section>
    <section className="how-it-works" aria-label="How practice works">
      <div><span className="step-number">01</span><h3>Understand the why.</h3><p>Learn the plans, not a string of moves.</p></div>
      <div><span className="step-number">02</span><h3>Play the position.</h3><p>Meet real-game opening replies.</p></div>
      <div><span className="step-number">03</span><h3>Make it your own.</h3><p>Leave the book. Stockfish plays on.</p></div>
    </section>
  </main>
}

function GambitCard({ gambit, index }: { gambit: Gambit; index: number }) {
  return <a className="gambit-card" href={`#/gambit/${gambit.id}`}>
    <div className="card-top"><span className="side-label"><span className={`side-dot ${gambit.side}`} />Play as {gambit.side}</span><span className="card-number">{String(index + 1).padStart(2, '0')}</span></div>
    <div className="card-emblem"><Mark /></div>
    <h3>{gambit.name}</h3>
    <p>{gambit.subtitle}</p>
    <div className="card-bottom"><span>{gambit.character}</span><span className="card-arrow" aria-hidden="true">↗</span></div>
  </a>
}

function Detail({ gambit }: { gambit: Gambit }) {
  return <main className="detail-page page-width">
    <a className="back-link" href="#/">Back to collection</a>
    <div className="detail-layout">
      <section>
        <span className="eyebrow">Play as {gambit.side} / {gambit.character}</span>
        <h1>{gambit.name}</h1>
        <p className="detail-subtitle">{gambit.subtitle}</p>
        <Ideas gambit={gambit} />
      </section>
      <aside className="detail-preview">
        <Board game={replay(gambit.setup)} side={gambit.side} />
        <div className="preview-caption"><span className="eyebrow">Your starting position</span><p>The offer is on the board. See how your partner responds.</p>
          <a className="primary-button full-width" href={`#/practice/${gambit.id}`}>Practice this gambit <span aria-hidden="true">↗</span></a>
          <p className="fine-print">No forced line. Play any legal move.</p>
        </div>
        <details className="source-details"><summary>About this repertoire</summary>
          <p>{gambit.lines.length} curated branches. {gambit.source.note}</p>
          <p><a href={gambit.source.url}>{gambit.source.name}</a> / {gambit.source.retrievedAt}</p>
        </details>
      </aside>
    </div>
  </main>
}

export default function App() {
  const [hash, setHash] = useState(window.location.hash)
  const pieceSet = usePieceSet()
  const [dark, setDark] = useState(document.documentElement.dataset.theme === 'dark')
  useEffect(() => {
    const change = () => { setHash(window.location.hash); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])
  const [, view, id] = hash.replace('#', '').split('/')
  const gambit = gambits.find((item) => item.id === id)
  const practice = view === 'practice' && gambit
  const base = import.meta.env.BASE_URL
  return <>
    <a className="skip-link" href="#main-content" onClick={(event) => {
      event.preventDefault()
      document.getElementById('main-content')?.focus()
    }}>Skip to content</a>
    <header className="site-header">
      <a className="brand" href="#/" aria-label="Gambit Lab home"><Mark small /><span>gambit<span className="brand-light">lab</span></span><span className="beta-tag">V1</span></a>
      <nav aria-label="Main navigation"><a href="#/" className={!practice ? 'nav-active' : ''}>The collection</a><a href="https://github.com/prasann/chess-gambits" target="_blank" rel="noreferrer">Open source <span aria-hidden="true">↗</span></a>
        <button className="theme-toggle" aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`} onClick={() => {
          document.documentElement.dataset.theme = dark ? 'light' : 'dark'
          setDark(!dark)
        }}>{dark ? 'Light' : 'Dark'}</button>
        <select className="piece-set-picker" aria-label="Piece set" value={pieceSet} onChange={(event) => setPieceSet(event.target.value as PieceSet)}>
          {pieceSets.map((set) => <option key={set.id} value={set.id}>{set.label}</option>)}
        </select>
      </nav>
    </header>
    <div id="main-content" tabIndex={-1}>
      {view === 'practice' && gambit ? <Practice gambit={gambit} key={gambit.id} />
        : view === 'gambit' && gambit ? <Detail gambit={gambit} />
          : !view || hash === '#library' ? <Library />
            : <main className="page-width not-found"><h1>That position is not in our collection.</h1><a href="#/">Back to the library</a></main>}
    </div>
    <footer className="site-footer">
      <div><a className="brand" href="#/"><Mark small /><span>gambitlab</span></a><p>Less memorizing. More understanding.</p></div>
      <div className="footer-links">
        <a href={`${base}LICENSE.txt`}>GPL-3.0</a><a href={`${base}THIRD-PARTY.txt`}>Notices</a>
        <a href={`${base}engine/app-source.tar.gz`}>App source</a><a href={`${base}engine/stockfish-source.tar.gz`}>Engine source</a>
        <a href={`${base}engine/nn-61e7af4bb97d.nnue`}>Network</a><a href={`${base}engine/BUILD.md`}>Engine build</a>
      </div>
    </footer>
  </>
}
