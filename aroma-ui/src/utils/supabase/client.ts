import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim();

if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is not configured.');
}

if (!supabaseKey) {
    throw new Error('VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY is not configured.');
}

let browserClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
    if (!browserClient) {
        browserClient = createSupabaseClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
            },
        });
    }

    return browserClient;
}
