
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kwruqjxzqyaknchjvghn.supabase.co';
const supabaseKey = 'sb_publishable_06mP6aFz7K_OYVy2cC0Jig_L5KRFkUH';

export const supabase = createClient(supabaseUrl, supabaseKey);
