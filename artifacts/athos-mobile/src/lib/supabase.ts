import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://myoopircjguuaaqlmjax.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_queFIFA2VAl2sqDmP2we3g_8L3YZ9Oz';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
