import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,              // ← not NEXT_PUBLIC_*
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // ← not the anon key
);
