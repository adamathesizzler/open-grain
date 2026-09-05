// Same Supabase project as studio/config.js — the anon key is safe to expose
// here, it can only ever do what supabase/schema.sql's RLS policies allow
// (for the public site, that's just: insert into `enquiries`, and read
// published portfolio items / selected social posts).
window.SUPABASE_URL = "https://YOUR-PROJECT-ref.supabase.co";
window.SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
