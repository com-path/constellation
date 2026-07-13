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
import { useStore } from '../store/store'
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

// Sky sync. localStorage remains the working copy; when signed in and unlocked,
// every change is encrypted client-side and pushed up (debounced). The server
// stores ciphertext only. Last write wins — it's one person's sky.

export type SyncStatus =
  | 'disabled' // no backend configured — pure local mode
  | 'signed_out'
  | 'locked' // signed in, passphrase not yet entered this session
  | 'syncing'
  | 'synced'
  | 'error'
  | 'offline' // local mode due to network unavailability

interface SyncCtx {
  status: SyncStatus
  email: string | null
  /** null until the first cloud check after sign-in; then whether a sky exists. */
  hasCloudSky: boolean | null
  sendMagicLink: (email: string) => Promise<void>
  /** Unlock an existing sky, or (first time) create the passphrase and upload. */
  unlock: (passphrase: string) => Promise<void>
  signOut: () => Promise<void>
  lastError: string | null
  /** Whether there are pending changes not yet synced to cloud */
  pendingSync: boolean
  /** Retry failed sync manually */
  retrySync: () => Promise<void>
}

const Ctx = createContext<SyncCtx | null>(null)

interface SkyRow {
  salt: string
  iv: string
  data: string
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStore()
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<SyncStatus>(supabase ? 'signed_out' : 'disabled')
  const [hasCloudSky, setHasCloudSky] = useState<boolean | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [pendingSync, setPendingSync] = useState(false)
  const keyRef = useRef<CryptoKey | null>(null)
  const saltRef = useRef<string | null>(null)
  const readyToPushRef = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state
  // Retry tracking to implement exponential backoff
  const syncAttemptsRef = useRef(0)
  const lastSyncErrorRef = useRef<string | null>(null)

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
      .select('salt, iv, data')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data as SkyRow | null) ?? null
  }, [])

  const pushNow = useCallback(async (userId: string) => {
    const key = keyRef.current
    const salt = saltRef.current
    if (!key || !salt) return
    try {
      const blob = await encryptJson(stateRef.current, key)
      const { error } = await supabase!.from('skies').upsert({
        user_id: userId,
        salt,
        iv: blob.iv,
        data: blob.ciphertext,
        updated_at: new Date().toISOString(),
      })
      if (error) throw new Error(error.message)
      // Success: reset retry counter
      syncAttemptsRef.current = 0
      lastSyncErrorRef.current = null
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      lastSyncErrorRef.current = errorMsg
      throw e
    }
  }, [])

  // On sign-in: check for a cloud sky and try a silent unlock with a
  // session-stashed key (survives reload within the same tab).
  useEffect(() => {
    if (!supabase) return
    if (!session) {
      keyRef.current = null
      saltRef.current = null
      readyToPushRef.current = false
      setHasCloudSky(null)
      setStatus('signed_out')
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
            const blob: EncryptedBlob = { iv: row.iv, ciphertext: row.data }
            const cloudState = await decryptJson<AppState>(blob, stashed.key)
            if (cancelled) return
            keyRef.current = stashed.key
            saltRef.current = stashed.salt
            dispatch({ type: 'load_state', state: cloudState })
            readyToPushRef.current = true
            setStatus('synced')
            return
          } catch {
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
  }, [session, fetchRow, dispatch])

  // Debounced encrypted push on every change once unlocked.
  useEffect(() => {
    if (!supabase || !session || !readyToPushRef.current || !keyRef.current) return
    setPendingSync(true)
    setStatus('syncing')
    const t = setTimeout(async () => {
      try {
        await pushNow(session.user.id)
        setPendingSync(false)
        setStatus('synced')
        setHasCloudSky(true)
        setLastError(null)
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e)
        syncAttemptsRef.current += 1
        setPendingSync(true)
        setLastError(errorMsg)
        // Only mark as error if we've tried multiple times
        if (syncAttemptsRef.current >= 3) {
          setStatus('error')
        } else {
          setStatus('synced') // Still synced, but will retry on next change
        }
      }
    }, 2000)
    return () => clearTimeout(t)
  }, [state, session, pushNow])

  const sendMagicLink = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Sync is not configured')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) throw new Error(error.message)
  }, [])

  const unlock = useCallback(
    async (passphrase: string) => {
      if (!supabase || !session) throw new Error('Not signed in')
      const userId = session.user.id
      const row = await fetchRow(userId)
      if (row) {
        // Existing sky: derive with its salt and decrypt.
        const key = await deriveKey(passphrase, row.salt)
        let cloudState: AppState
        try {
          cloudState = await decryptJson<AppState>({ iv: row.iv, ciphertext: row.data }, key)
        } catch {
          throw new Error("That passphrase doesn't open this sky. It cannot be recovered — only re-entered correctly.")
        }
        keyRef.current = key
        saltRef.current = row.salt
        await stashKey(key, row.salt, userId)
        dispatch({ type: 'load_state', state: cloudState })
        readyToPushRef.current = true
        setStatus('synced')
      } else {
        // First time: create the key and upload the current local sky.
        const salt = randomSalt()
        const key = await deriveKey(passphrase, salt)
        keyRef.current = key
        saltRef.current = salt
        await stashKey(key, salt, userId)
        readyToPushRef.current = true
        await pushNow(userId)
        setHasCloudSky(true)
        setStatus('synced')
      }
    },
    [session, fetchRow, pushNow, dispatch],
  )

  const retrySync = useCallback(async () => {
    if (!session || !keyRef.current) {
      setLastError('Not signed in or unlocked')
      return
    }
    setStatus('syncing')
    try {
      await pushNow(session.user.id)
      setPendingSync(false)
      setStatus('synced')
      setLastError(null)
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      setLastError(errorMsg)
      setStatus('error')
    }
  }, [session, pushNow])

  const signOut = useCallback(async () => {
    if (!supabase) return
    // Flush any pending change before leaving, so nothing is lost.
    if (session && keyRef.current && readyToPushRef.current && pendingSync) {
      try {
        await pushNow(session.user.id)
      } catch (e) {
        console.warn('[Sync] Failed to flush on sign-out:', e)
        // the local copy still holds everything
      }
    }
    clearStashedKey()
    keyRef.current = null
    saltRef.current = null
    readyToPushRef.current = false
    setPendingSync(false)
    await supabase.auth.signOut()
  }, [session, pushNow, pendingSync])

  // Flush pending changes when the tab is backgrounded or closed.
  // beforeunload cannot reliably await async work — browsers don't wait for
  // it — so we fire the flush on visibilitychange instead, which fires
  // synchronously and early enough (tab switch, close, minimize) to give
  // the request a real chance to leave before the page is torn down.
  useEffect(() => {
    if (!session || !keyRef.current || !readyToPushRef.current) return

    const flushIfPending = () => {
      if (document.visibilityState === 'hidden' && pendingSync) {
        pushNow(session.user.id).catch(() => {
          // Best-effort — the local copy still holds everything, and the
          // next foreground sync attempt will retry.
        })
      }
    }

    document.addEventListener('visibilitychange', flushIfPending)
    return () => document.removeEventListener('visibilitychange', flushIfPending)
  }, [session, pendingSync, pushNow])

  return (
    <Ctx.Provider
      value={{
        status,
        email: session?.user.email ?? null,
        hasCloudSky,
        sendMagicLink,
        unlock,
        signOut,
        lastError,
        pendingSync,
        retrySync,
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
