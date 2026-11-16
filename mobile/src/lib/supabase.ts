import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://wcxbvsgwmnavivapndit.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_DdOkgH3MEzJLkBYBTTMYpg_fSrcdVqc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
