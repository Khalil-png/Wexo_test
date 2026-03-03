
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kwruqjxzqyaknchjvghn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3cnVxanh6cXlha25jaGp2Z2huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2OTI3NTksImV4cCI6MjA4NTI2ODc1OX0.h08-BmfFHkoHwfhhRkc8kAEYWw72PfcB1cEqTYYWZjY';

// Initialisation du client Supabase avec la bonne clé anon
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
