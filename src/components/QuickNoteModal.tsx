import { useEffect, useRef, useState } from 'react'
import type { Person } from '../types'
import { useStore } from '../store/store'
import { parseNote, type ExtractedDetail } from '../lib/noteParser'
import { Modal } from './ui'

// The walk-home voice note (§8.2a): "saw Marco, he's stressed about the flat,
// his sister's visiting in March" → structured suggestions on Marco's page.
// Extraction, not conversation — the app proposes, the user confirms each item.

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | (new () => SpeechRecognitionLike)
    | null
}

export function QuickNoteModal({ person, onClose }: { person: Person; onClose: () => void }) {
  const { dispatch } = useStore()
  const [note, setNote] = useState('')
  const [suggestions, setSuggestions] = useState<ExtractedDetail[] | null>(null)
  const [accepted, setAccepted] = useState<Set<number>>(new Set())
  const [listening, setListening] = useState(false)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const canDictate = getSpeechRecognition() != null

  useEffect(() => () => recRef.current?.stop(), [])

  const toggleDictation = () => {
    if (listening) {
      recRef.current?.stop()
      setListening(false)
      return
    }
    const Ctor = getSpeechRecognition()
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = navigator.language || 'en-GB'
    rec.interimResults = false
    rec.continuous = true
    rec.onresult = (e) => {
      const chunks: string[] = []
      for (let i = 0; i < e.results.length; i++) chunks.push(e.results[i][0].transcript)
      setNote((cur) => (cur ? cur + ' ' : '') + chunks[chunks.length - 1])
    }
    rec.onend = () => setListening(false)
    recRef.current = rec
    rec.start()
    setListening(true)
  }

  const extract = () => {
    const found = parseNote(note)
    setSuggestions(found)
    setAccepted(new Set(found.map((_, i) => i)))
  }

  const save = () => {
    if (!suggestions) return
    const details = { ...person.details }
    for (let i = 0; i < suggestions.length; i++) {
      if (!accepted.has(i)) continue
      const s = suggestions[i]
      details[s.field] = [...details[s.field], s.text]
    }
    dispatch({ type: 'update_person', person: { ...person, details } })
    onClose()
  }

  return (
    <Modal title={`A note about ${person.name}`} onClose={onClose}>
      {suggestions === null ? (
        <>
          <p className="hint">
            Type it like you'd say it on the walk home. It gets sorted onto their page — you
            approve every detail before it lands.
          </p>
          <textarea
            className="wide"
            rows={4}
            autoFocus
            placeholder="e.g. saw Marco, he's stressed about the flat, his sister's visiting in March"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="modal-footer">
            {canDictate && (
              <button className={`btn ghost ${listening ? 'listening' : ''}`} onClick={toggleDictation}>
                {listening ? '● Listening… tap to stop' : '🎙 Dictate'}
              </button>
            )}
            <button className="btn" onClick={extract} disabled={!note.trim()}>
              Sort it out
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="hint">
            Here's what was heard. Untick anything that's wrong — nothing lands without you.
          </p>
          <ul className="extract-list">
            {suggestions.map((s, i) => (
              <li key={i}>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={accepted.has(i)}
                    onChange={(e) => {
                      const next = new Set(accepted)
                      if (e.target.checked) next.add(i)
                      else next.delete(i)
                      setAccepted(next)
                    }}
                  />
                  <span>
                    <strong>{s.fieldLabel}:</strong> {s.text}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="modal-footer">
            <button className="btn ghost" onClick={() => setSuggestions(null)}>
              Back
            </button>
            <button className="btn" onClick={save} disabled={accepted.size === 0}>
              Add to their page
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
