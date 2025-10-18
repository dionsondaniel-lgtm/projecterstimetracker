
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pofbpjkcequssxduqqes.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvZmJwamtjZXF1c3N4ZHVxcWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1ODAwMjksImV4cCI6MjA3NjE1NjAyOX0.K0QXBfRGCNUllHaoewxTy7WgbWsTrtG5pXQ74hNeiYI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);