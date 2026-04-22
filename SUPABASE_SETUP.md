# Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor and run `supabase-schema.sql`.
3. Copy `config.example.js` to `config.js`.
4. Put your project URL and publishable key into `config.js`.
5. Redeploy the site on Render.

How it works now:
- browser pages call the same Render domain at `/api/...`
- `server.js` on Render proxies those requests to Supabase
- mobile devices no longer need direct access to `supabase.co`
- failed writes are queued in browser storage and retried automatically when the network returns

When `config.js` has a valid Supabase URL and publishable key:
- `scan.html` writes machine jobs through Render proxy
- `scan.html` writes status update history through Render proxy
- `part.html` reads and writes Cycle Time settings through Render proxy
- `index.html` reads machine jobs and history through Render proxy
- pending offline writes retry automatically

If Render proxy is not available, the app falls back to browser `localStorage`.
