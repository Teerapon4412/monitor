# Monitor

Static machine monitor and QR scan station for updating current MC production status.

## Pages

- `index.html` - monitor dashboard
- `scan.html` - QR scan station
- `part.html` - part master settings and Cycle Time editor
- `server.js` - Render proxy server for Supabase and static files

## Deploy

This project is ready to deploy on Render using `render.yaml`.

## Cloud Sync

- Copy `config.example.js` to `config.js`
- Add your Supabase project URL and publishable key
- Run `supabase-schema.sql` in the Supabase SQL editor
- See `SUPABASE_SETUP.md` for the full setup
