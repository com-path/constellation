import { useEffect, useMemo, useState } from 'react'
import type { ViewMode } from './types'
import { StoreProvider, useStore } from './store/store'
import { SyncProvider, useSync } from './sync/SyncContext'
import { AccountPanel, SyncStatusButton } from './components/AccountPanel'
import { Tour, TOUR_DONE_KEY } from './components/Tour'
import { GettingStarted } from './components/GettingStarted'
import { CatalogueView } from './components/CatalogueView'
import { ConstellationCanvas } from './graph/ConstellationCanvas'
import type { GraphInput } from './graph/simulation'
import { activeProposals, attentionItems, bondStrength, capacityNote, weeklySuggestions } from './lib/closeness'
import { computeSparks } from './lib/sparks'
import { eventCandidates } from './lib/events'
import { PersonProfile } from './components/PersonProfile'
import { LogActionModal } from './components/LogActionModal'
import { AddPersonModal } from './components/AddPersonModal'
import { QuickNoteModal } from './components/QuickNoteModal'
import { SparksPanel } from './components/SparksPanel'
import { EventsPanel } from './components/EventsPanel'
import { AttentionPanel } from './components/AttentionPanel'
import { EffortMirror } from './components/EffortMirror'
import { ProposalToasts } from './components/ProposalToasts'

const VIEWS: Array<{ id: ViewMode; label: string; hint: string }> = [
  { id: 'closeness', label: 'Closeness', hint: 'Rings and brightness — how close people are' },
  { id: 'network', label: 'Network', hint: 'How you all know each other' },
  { id: 'events', label: 'Events', hint: 'Something’s come up — who fits?' },
  { id: 'attention', label: 'Attention', hint: 'Who’s been on your mind' },
  { id: 'sparks', label: 'Sparks', hint: 'Introductions waiting to happen' },
  { id: 'catalogue', label: 'Catalogue', hint: 'Every star in rows — search, sort, filter' },
]

function AppInner() {
  const { state, dispatch } = useStore()
  const [view, setView] = useState<ViewMode>('closeness')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [logWith, setLogWith] = useState<string[] | null>(null)
  const [addingPerson, setAddingPerson] = useState(false)
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const [mirrorOpen, setMirrorOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [eventHighlight, setEventHighlight] = useState<Set<string> | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(
    () => localStorage.getItem(TOUR_DONE_KEY) !== 'done',
  )

  // A signed-in-but-locked sky needs the passphrase before sync resumes —
  // surface the panel once rather than leaving a silent lock.
  const sync = useSync()
  useEffect(() => {
    if (sync.status === 'locked') setAccountOpen(true)
  }, [sync.status])

  const graphInput: GraphInput = useMemo(
    () => ({
      nodes: state.people.map((p) => ({
        id: p.id,
        name: p.name,
        ring: p.ring,
        mass: bondStrength(state.actions, p),
        contexts: p.contexts,
      })),
      links: state.edges.map((e) => ({
        source: e.a,
        target: e.b,
        context: e.context,
        introducedByUser: e.introducedByUser,
      })),
    }),
    [state.people, state.edges, state.actions],
  )

  const sparks = useMemo(() => (view === 'sparks' ? computeSparks(state) : []), [view, state])
  const proposals = useMemo(
    () => (view === 'closeness' ? activeProposals(state) : []),
    [view, state],
  )

  const highlightIds = useMemo(() => {
    if (view === 'attention') {
      const ids = new Set<string>()
      for (const w of weeklySuggestions(state)) ids.add(w.personId)
      for (const it of attentionItems(state)) ids.add(it.personId)
      return ids
    }
    if (view === 'sparks') {
      const ids = new Set<string>()
      for (const s of sparks) {
        ids.add(s.a)
        ids.add(s.b)
      }
      return ids.size > 0 ? ids : null
    }
    if (view === 'events') {
      if (eventHighlight) return eventHighlight
      const ev = state.events.find((e) => e.id === selectedEventId)
      if (ev) return new Set(eventCandidates(state, ev).map((c) => c.personId))
      return null
    }
    return null
  }, [view, state, sparks, selectedEventId, eventHighlight])

  const sparkPairs = useMemo(
    () => (view === 'sparks' ? sparks.map((s) => [s.a, s.b] as [string, string]) : []),
    [view, sparks],
  )

  const capNotes = useMemo(
    () =>
      ([1, 2, 3] as const)
        .map((r) => capacityNote(state, r))
        .filter((n): n is string => n != null),
    [state],
  )

  const selected = state.people.find((p) => p.id === selectedId) ?? null
  const notePerson = state.people.find((p) => p.id === noteFor) ?? null
  const activeView = VIEWS.find((v) => v.id === view)!

  return (
    <div className="app">
      <header className="top-bar">
        <h1>
          Constellation<span className="tagline"> — the people in your sky</span>
        </h1>
        <nav className="view-tabs" aria-label="Views">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              className={`tab ${view === v.id ? 'tab-on' : ''}`}
              title={v.hint}
              onClick={() => {
                setView(v.id)
                if (v.id !== 'events') {
                  setEventHighlight(null)
                  setSelectedEventId(null)
                }
              }}
            >
              {v.label}
            </button>
          ))}
        </nav>
        <div className="top-actions">
          <button className="btn small" onClick={() => setLogWith(selected ? [selected.id] : [])}>
            Log a moment
          </button>
          <button className="btn small ghost" onClick={() => setAddingPerson(true)}>
            New star
          </button>
          <button className="btn small ghost" onClick={() => setMirrorOpen(true)}>
            Effort mirror
          </button>
        </div>
      </header>

      <p className="view-hint">{activeView.hint}</p>
      {capNotes.length > 0 && view === 'closeness' && (
        <p className="capacity-note">{capNotes[0]}</p>
      )}

      <main className="stage">
        {view === 'catalogue' ? (
          <CatalogueView onSelectPerson={setSelectedId} />
        ) : (
          <ConstellationCanvas
            input={graphInput}
            people={state.people}
            viewMode={view}
            selectedId={selectedId}
            highlightIds={highlightIds}
            sparkPairs={sparkPairs}
            onSelect={setSelectedId}
          />
        )}

        {view === 'sparks' && <SparksPanel sparks={sparks} onSelectPerson={setSelectedId} />}
        {view === 'events' && (
          <EventsPanel
            selectedEventId={selectedEventId}
            onSelectEvent={setSelectedEventId}
            onHighlight={setEventHighlight}
            onSelectPerson={setSelectedId}
          />
        )}
        {view === 'attention' && (
          <AttentionPanel
            onSelectPerson={setSelectedId}
            onLogWith={(id) => setLogWith([id])}
          />
        )}
        {view === 'network' && <NetworkLegend />}

        {selected && (
          <PersonProfile
            person={selected}
            onClose={() => setSelectedId(null)}
            onLogAction={() => setLogWith([selected.id])}
            onQuickNote={() => setNoteFor(selected.id)}
          />
        )}

        {view === 'closeness' && !tourOpen && <ProposalToasts proposals={proposals} />}

        {view === 'closeness' && !tourOpen && !selected && (
          <GettingStarted
            onAddPerson={() => setAddingPerson(true)}
            onLogMoment={() => setLogWith([])}
            onOpenPerson={setSelectedId}
          />
        )}
      </main>

      <footer className="foot">
        <span className="muted small">
          {sync.status === 'disabled'
            ? 'Lives entirely in this browser — nothing leaves your device.'
            : 'Everything is encrypted on this device — the server only ever sees ciphertext.'}
        </span>
        <span className="foot-links">
          <SyncStatusButton onClick={() => setAccountOpen(true)} />
          <button className="link small" onClick={() => setTourOpen(true)}>
            tour
          </button>
          <button className="link small" onClick={() => dispatch({ type: 'reset_demo' })}>
            demo sky
          </button>
          <button
            className="link small"
            onClick={() => {
              if (window.confirm('Start with an empty sky? Your current constellation will be erased from this browser.')) {
                dispatch({ type: 'clear_all' })
                setSelectedId(null)
              }
            }}
          >
            start fresh
          </button>
        </span>
      </footer>

      {logWith !== null && (
        <LogActionModal initialPersonIds={logWith} onClose={() => setLogWith(null)} />
      )}
      {addingPerson && <AddPersonModal onClose={() => setAddingPerson(false)} />}
      {notePerson && <QuickNoteModal person={notePerson} onClose={() => setNoteFor(null)} />}
      {mirrorOpen && <EffortMirror onClose={() => setMirrorOpen(false)} />}
      {accountOpen && <AccountPanel onClose={() => setAccountOpen(false)} />}
      {tourOpen && (
        <Tour
          ctx={{ setView, setSelectedId, setMirrorOpen }}
          onFinish={(startFresh) => {
            localStorage.setItem(TOUR_DONE_KEY, 'done')
            setTourOpen(false)
            setMirrorOpen(false)
            if (startFresh) {
              dispatch({ type: 'clear_all' })
              setSelectedId(null)
              setView('closeness')
            }
          }}
        />
      )}
    </div>
  )
}

/** Contexts legend for the network lens — nebula tints are decorative; names carry identity. */
function NetworkLegend() {
  const { state } = useStore()
  const contexts = [...new Set(state.people.flatMap((p) => p.contexts))].sort()
  const colors = ['#c08428', '#3d7fd4', '#c74e6e', '#8763d6', '#1f9a6e', '#a06a3a', '#4f8f9f', '#7a6fb8']
  const introduced = state.edges.filter((e) => e.introducedByUser).length
  return (
    <div className="side-panel slim-panel">
      <h3>Where people entered your life</h3>
      <ul className="legend-list">
        {contexts.map((c, i) => (
          <li key={c}>
            <span className="type-dot" style={{ background: colors[i % colors.length] }} />
            {c}
            <span className="muted">
              {' '}
              · {state.people.filter((p) => p.contexts.includes(c)).length}
            </span>
          </li>
        ))}
      </ul>
      {introduced > 0 && (
        <p className="panel-lede">
          {introduced} thread{introduced === 1 ? '' : 's'} in this sky exist because you drew
          {introduced === 1 ? ' it' : ' them'} — introductions you made, shown in gold.
        </p>
      )}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <SyncProvider>
        <AppInner />
      </SyncProvider>
    </StoreProvider>
  )
}
