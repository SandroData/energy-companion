// Client-side anon Supabase client (for future use; not required for this Track A page)
import { createClient } from '@supabase/supabase-js'


export const supabaseClient = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)