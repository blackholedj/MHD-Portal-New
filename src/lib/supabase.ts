// src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Chybí proměnné prostředí pro Supabase. Zkontrolujte .env.local')
}

// Klient pro interakci na straně prohlížeče
export const supabase = createClient(supabaseUrl, supabaseAnonKey)