// Same Supabase project as studio/config.js — the anon key is safe to expose
// here, it can only ever do what supabase/schema.sql's RLS policies allow
// (for the public site, that's just: insert into `enquiries`, and read
// published portfolio items / selected social posts).
window.SUPABASE_URL = "https://dmegetqsiowxwiibcxmv.supabase.co";
window.SUPABASE_ANON_KEY = "sb_publishable_1FXmgEWqmmRPZZp3lCpOiA_VfJ8JyIx";

// Google Analytics 4 — only loads after the visitor accepts the cookie
// banner (see main.js). Create a GA4 property at analytics.google.com
// (Admin → Data streams → Web) and paste its Measurement ID below,
// replacing the placeholder — it looks like "G-XXXXXXXXXX".
window.GA_MEASUREMENT_ID = "G-XXXXXXXXXX";
