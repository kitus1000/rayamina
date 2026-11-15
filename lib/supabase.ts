
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dmlhmgnkmdjujhefzrmz.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_gM9gIe8-qjOpO-3aKNHokw_uM7Sw5DJ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
