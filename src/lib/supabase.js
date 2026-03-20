import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://nnxvrtajensdgicimoar.supabase.co';
const SUPABASE_ANON = 'sb_publishable_DeOg3YoYV0VBzh1jujv7ZQ_1EZ2h-sY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
