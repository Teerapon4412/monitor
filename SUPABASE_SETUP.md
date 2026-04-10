# Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor and run `supabase-schema.sql`.
3. Copy `config.example.js` to `config.js`.
4. Put your project URL and anon key into `config.js`.
5. Redeploy the site on Render.

When `config.js` has a valid Supabase URL and anon key:
- `scan.html` writes machine jobs to Supabase
- `scan.html` also writes status update history to Supabase
- `part.html` reads and writes injection time settings to Supabase
- `index.html` reads the same machine jobs from Supabase
- `index.html` reads machine status history from Supabase
- monitor refreshes from cloud every 5 seconds

If Supabase is not configured, the app falls back to browser `localStorage`.
