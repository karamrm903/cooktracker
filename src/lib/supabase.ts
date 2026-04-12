import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn("Supabase URL or Anon Key is missing. Ensure your .env variables are set.");
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON || '', {
  auth: {
    storage: AsyncStorage as any, // Cast due to internal Supabase storage typing mismatch
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
