import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import type { AppState } from '../types'
import { emptyTombstones } from '../types'
import { normalizeState, useStore } from '../store/store'
import { isDemoState, mergeStates, stableStringify } from '../lib/merge'
import { supabase } from './supabaseClient'
import {
  clearStashedKey,
  decryptJson,
  deriveKey,
  encryptJson,
  randomSalt,
  restoreKey,
  stashKey,
  type EncryptedBlob,
} from './crypto'

// Sky sync, merge-based. localStorage remains the working copy; the cloud
// holds one encrypted blob per user. The rules that keep two devices honest:
//
//  1. NEVER overwrite blind. Every push is a compare-and-swap on updated_at;
//     if another device wrote first, we pull, MERGE (per-record newest-wins,
//     deletions honoured via tombstones), and retry with the merged sky.
//  2. NEVER replace blind. Every pull merges into the local sky instead of
//     wholesale-replacing it, so unpushed local edits survive.
//  3. Pull when the tab wakes (focus/visibility), flush when it hides —
//     a device left open stays fresh, and a quick edit-then-switch still lands.
//  4. The demo sky is a tour, not data: it is never uploaded, never merged.

export type SyncStatus =
  | 'disabled' // no backend configured — pure local mode
  | 'signed_out'
  | 'locked' // signed in, passphrase not yet entered this session
  | 'syncing'
  | 'synced'
  | 'error'

interface SyncCtx {
  status: SyncStatus
  email: string | null
  /** null until the first cloud check after sign-in; then whether a sky exists. */
  hasCloudSky: boolean | null
  sendMagicLink: (email: string) => Promise<void>
  /** Sign in with the 6-digit code from the email — works even when the link
   *  would open in the wrong browser (in-app email viewers on phones). */
  verifyCode: (email: string, code: string) => Promise<void>
  /** Unlock an existing sky, or (first time) create the passphrase and upload. */
  unlock: (passphrase: string) => Promise<void>
  /** Re-run the cloud check after an error — the passphrase step follows. */
  retry: () => void
  signOut: () => Promise<void>
  lastError: string | null
}

const Ctx = createContext<SyncCtx | null>(null)

interface SkyRow {
  salt: string
  iv: string
  data: string
  updated_at: string
}

const emptySky = (): AppState => ({
  people: [],
  edges: [],
  actions: [],
  events: [],
  sparkStates: [],
  dismissedProposals: [],
  reminders: [],
  tombstones: emptyTombstones(),
})

export function SyncProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStore()
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<SyncStatus>(supabase ? 'signed_out' : 'disabled')
  const [hasCloudSky, setHasCloudSky] = useState<boolean | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [initNonce, setInitNonce] = useState(0)

  const keyRef = useRef<CryptoKey | null>(null)
  const saltRef = useRef<string | null>(null)
  /** Server-returned updated_at of the row this device last saw. null = no row known. */
  const lastSeenRef = useRef<string | null>(null)
  /** stableStringify of the sky we believe the cloud currently holds. */
  const cloudStrRef = useRef<string | null>(null)
  /** True only after the cloud copy has been reconciled at least once. */
  const readyRef = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state
  /** Serialises pulls and pushes so they can never interleave. */
  const chainRef = useRef<Promise<void>>(Promise.resolve())

  // Track the auth session.
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const fetchRow = useCallback(async (userId: string): Promise<SkyRow | null> => {
    const { data, error } = await supabase!
      .from('skies')
      .select('salt, iv, data, updated_at')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data as SkyRow | null) ?? null
  }, [])

  /** Decrypt a row and reconcile it with `base`. Dispatches the merged sky
   *  when it differs from what's on screen. Returns the merged sky. */
  const adoptRow = useCallback(
    async (row: SkyRow, base: AppState): Promise<AppState> => {
      const key = keyRef.current
      if (!key) return base
      const blob: EncryptedBlob = { iv: row.iv, ciphertext: row.data }
      const cloud = normalizeState(await decryptJson<AppState>(blob, key))
      // The demo sky never merges into real data — a device still showing the
      // demo simply adopts the real sky.
      const merged = isDemoState(base) ? cloud : mergeStates(normalizeState(base), cloud)
      lastSeenRef.current = row.updated_at
      cloudStrRef.current = stableStringify(cloud)
      if (stableStringify(merged) !== stableStringify(stateRef.current)) {
        dispatch({ type: 'load_state', state: merged })
      }
      return merged
    },
    [dispatch],
  )

  /** Push a specific snapshot with optimistic concurrency. On a lost race:
   *  pull, merge, retry with the merged sky. */
  const pushSnapshot = useCallback(
    async (userId: string, snapshot: AppState): Promise<void> => {
      const salt = saltRef.current
      if (!keyRef.current || !salt) return
      let toPush = snapshot
      for (let attempt = 0; attempt < 4; attempt++) {
        if (isDemoState(toPush)) return // the tour never uploads
        const key = keyRef.current
        if (!key) return
        const blob = await encryptJson(toPush, key)
        const body = {
          salt,
          iv: blob.iv,
          data: blob.ciphertext,
          updated_at: new Date().toISOString(),
        }
        if (lastSeenRef.current === null) {
          const { data, error } = await supabase!
            .from('skies')
            .insert({ user_id: userId, ...body })
            .select('updated_at')
            .single()
          if (!error) {
            lastSeenRef.current = (data as { updated_at: string }).updated_at
            cloudStrRef.current = stableStringify(toPush)
            setHasCloudSky(true)
            return
          }
          if (error.code !== '23505') throw new Error(error.message)
          // A row appeared since we looked (another device won the create).
          const row = await fetchRow(userId)
          if (row) toPush = await adoptRow(row, toPush)
          continue
        }
        const { data, error } = await supabase!
          .from('skies')
          .update(body)
          .eq('user_id', userId)
          .eq('updated_at', lastSeenRef.current)
          .select('updated_at')
        if (error) throw new Error(error.message)
        const rows = data as Array<{ updated_at: string }>
        if (rows.length > 0) {
          lastSeenRef.current = rows[0].updated_at
          cloudStrRef.current = stableStringify(toPush)
          setHasCloudSky(true)
          return
        }
        // Someone else wrote since we last looked — reconcile and try again.
        const row = await fetchRow(userId)
        if (!row) {
          lastSeenRef.current = null // row deleted server-side; recreate
          continue
        }
        toPush = await adoptRow(row, toPush)
      }
      throw new Error('The sky is being written from another device — will retry on the next change.')
    },
    [adoptRow, fetchRow],
  )

  /** Cheap freshness check → full pull+merge only when the cloud moved. */
  const pullIfChanged = useCallback(
    async (userId: string): Promise<void> => {
      const { data, error } = await supabase!
        .from('skies')
        .select('updated_at')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      const meta = data as { updated_at: string } | null
      if (!meta) return
      if (meta.updated_at === lastSeenRef.current) return
      const row = await fetchRow(userId)
      if (row) await adoptRow(row, stateRef.current)
    },
    [adoptRow, fetchRow],
  )

  /** Everything cloud-touching runs through here, strictly one at a time. */
  const enqueue = useCallback(
    (task: () => Promise<void>): Promise<void> => {
      const run = chainRef.current.then(task).then(
        () => {
          setStatus('synced')
          setLastError(null)
        },
        (e) => {
          setLastError(e instanceof Error ? e.message : String(e))
          setStatus('error')
        },
      )
      chainRef.current = run
      return run
    },
    [],
  )

  // On sign-in (and on every auth refresh event): reconcile with the cloud.
  useEffect(() => {
    if (!supabase) return
    if (!session) {
      keyRef.current = null
      saltRef.current = null
      lastSeenRef.current = null
      cloudStrRef.current = null
      readyRef.current = false
      setHasCloudSky(null)
      setStatus('signed_out')
      return
    }
    // Already unlocked — this is a token refresh or a wake-up, not a fresh
    // sign-in. A pull keeps a long-open device from going stale.
    if (readyRef.current && keyRef.current) {
      void enqueue(() => pullIfChanged(session.user.id))
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const row = await fetchRow(session.user.id)
        if (cancelled) return
        setHasCloudSky(row !== null)
        const stashed = await restoreKey(session.user.id)
        if (stashed && row && stashed.salt === row.salt) {
          try {
            keyRef.current = stashed.key
            saltRef.current = stashed.salt
            const merged = await adoptRow(row, stateRef.current)
            if (cancelled) return
            readyRef.current = true
            setStatus('synced')
            // Local edits from before this load survive the merge — if they
            // added anything, ship them now.
            if (stableStringify(merged) !== cloudStrRef.current) {
              void enqueue(() => pushSnapshot(session.user.id, merged))
            }
            return
          } catch {
            keyRef.current = null
            saltRef.current = null
            clearStashedKey() // key no longer matches — ask again
          }
        }
        if (!cancelled) setStatus('locked')
      } catch (e) {
        if (!cancelled) {
          setLastError(e instanceof Error ? e.message : String(e))
          setStatus('error')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session, initNonce, fetchRow, adoptRow, pushSnapshot, pullIfChanged, enqueue])

  // Debounced push on every change once unlocked — CAS-guarded, so a stale
  // device can no longer clobber a newer cloud.
  useEffect(() => {
    if (!supabase || !session || !readyRef.current || !keyRef.current) return
    if (isDemoState(state)) return // browsing the demo never uploads
    if (stableStringify(state) === cloudStrRef.current) {
      setStatus('synced') // an edit may have reverted to exactly the cloud content
      return
    }
    setStatus('syncing')
    const t = setTimeout(() => {
      void enqueue(() => pushSnapshot(session.user.id, stateRef.current))
    }, 2000)
    return () => clearTimeout(t)
  }, [state, session, pushSnapshot, enqueue])

  // Wake/sleep of the tab: pull when it comes back, flush when it goes away.
  useEffect(() => {
    if (!supabase || !session) return
    const userId = session.user.id
    const onWake = () => {
      if (!readyRef.current || !keyRef.current) return
      void enqueue(() => pullIfChanged(userId))
    }
    const onHide = () => {
      if (document.visibilityState !== 'hidden') return
      if (!readyRef.current || !keyRef.current) return
      if (stableStringify(stateRef.current) === cloudStrRef.current) return
      // The 2s debounce may never fire once the tab is hidden — flush now.
      void enqueue(() => pushSnapshot(userId, stateRef.current))
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') onWake()
      else onHide()
    }
    window.addEventListener('focus', onWake)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('focus', onWake)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onHide)
    }
  }, [session, pullIfChanged, pushSnapshot, enqueue])

  const sendMagicLink = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Sync is not configured')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) throw new Error(error.message)
  }, [])

  const verifyCode = useCallback(async (email: string, code: string) => {
    if (!supabase) throw new Error('Sync is not configured')
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    })
    if (error) throw new Error(error.message)
  }, [])

  const unlock = useCallback(
    async (passphrase: string) => {
      if (!supabase || !session) throw new Error('Not signed in')
      const userId = session.user.id
      const row = await fetchRow(userId)
      if (row) {
        // Existing sky: derive with its salt, decrypt, and MERGE with whatever
        // this device holds — edits made while locked are kept, not erased.
        const key = await deriveKey(passphrase, row.salt)
        try {
          await decryptJson<AppState>({ iv: row.iv, ciphertext: row.data }, key)
        } catch {
          throw new Error("That passphrase doesn't open this sky. It cannot be recovered — only re-entered correctly.")
        }
        keyRef.current = key
        saltRef.current = row.salt
        await stashKey(key, row.salt, userId)
        const merged = await adoptRow(row, stateRef.current)
        readyRef.current = true
        setStatus('synced')
        if (stableStringify(merged) !== cloudStrRef.current) {
          void enqueue(() => pushSnapshot(userId, merged))
        }
      } else {
        // First time: create the key and upload this device's sky — unless
        // it's still the demo tour, which starts the cloud empty instead.
        const salt = randomSalt()
        const key = await deriveKey(passphrase, salt)
        keyRef.current = key
        saltRef.current = salt
        lastSeenRef.current = null
        await stashKey(key, salt, userId)
        const local = stateRef.current
        const first = isDemoState(local) ? emptySky() : local
        if (isDemoState(local)) dispatch({ type: 'clear_all' })
        readyRef.current = true
        await pushSnapshot(userId, first)
        setHasCloudSky(true)
        setStatus('synced')
      }
    },
    [session, fetchRow, adoptRow, pushSnapshot, enqueue, dispatch],
  )

  const retry = useCallback(() => {
    setLastError(null)
    setInitNonce((n) => n + 1) // re-runs the cloud check; it lands on the right status
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    // Flush any pending change before leaving, so nothing is lost.
    if (session && keyRef.current && readyRef.current) {
      if (stableStringify(stateRef.current) !== cloudStrRef.current) {
        try {
          await pushSnapshot(session.user.id, stateRef.current)
        } catch (e) {
          // The local copy still holds everything, but be honest about it.
          setLastError(
            `Couldn't upload the last changes before signing out (${e instanceof Error ? e.message : 'unknown error'}). They remain safe on this device.`,
          )
        }
      }
    }
    clearStashedKey()
    keyRef.current = null
    saltRef.current = null
    lastSeenRef.current = null
    cloudStrRef.current = null
    readyRef.current = false
    await supabase.auth.signOut()
  }, [session, pushSnapshot])

  return (
    <Ctx.Provider
      value={{
        status,
        email: session?.user.email ?? null,
        hasCloudSky,
        sendMagicLink,
        verifyCode,
        unlock,
        retry,
        signOut,
        lastError,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useSync(): SyncCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSync outside provider')
  return ctx
}
