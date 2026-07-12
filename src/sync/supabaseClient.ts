import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Sync backend, entirely optional: without these env vars the app runs
// pure local-first, exactly as before accounts existed.

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null
