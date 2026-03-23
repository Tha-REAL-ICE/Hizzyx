import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mqrpzfgyycbvpxbyzbgk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xcnB6Zmd5eWNidnB4Ynl6YmdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxOTc1OTEsImV4cCI6MjA4OTc3MzU5MX0.zZDLjbrkOSIZivhLYFKZb-6np2_WiAjb-TrOiLnwUIA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
