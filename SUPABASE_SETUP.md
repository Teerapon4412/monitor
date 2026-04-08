# Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor and run `supabase-schema.sql`.
3. Copy `config.example.js` to `config.js`.
4. Put your project URL and anon key into `config.js`.
5. Set an Edge Function secret:
   `supabase secrets set OPENAI_API_KEY=YOUR_OPENAI_API_KEY`
6. Deploy the Edge Function:
   `supabase functions deploy transcribe-detail --no-verify-jwt`
7. Redeploy the site on Render.

When `config.js` has a valid Supabase URL and anon key:
- `scan.html` writes machine jobs to Supabase
- `index.html` reads the same machine jobs from Supabase
- monitor refreshes from cloud every 5 seconds
- `scan.html` can send recorded audio to `transcribe-detail` for Detail transcription

If Supabase is not configured, the app falls back to browser `localStorage`.
