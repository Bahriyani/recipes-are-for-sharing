# Security

## Secret Handling
- `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` live in Vercel environment variables only — never in client-side code or the repo.
- Frontend uses only the Supabase anon key (public, safe).
- Storage bucket for recipe photos is set to **public read**, **authenticated (or service-role) write only**.

## Permission Model
- **v1:** RLS open policies allow anonymous reads and writes (demo mode). No sensitive personal data is collected.
- **Lock-down sprint:** `insert/update/delete` on `recipe_memories` requires `auth.uid() = user_id`. Public `select` remains open so shared URLs continue to work without login.
- Agents and server functions run with the **anon key** (user-level permissions) unless a service-role action is explicitly required and logged.

## Approved Tools Rule
Only named, scoped tools are used by any automated step: `supabase.storage.upload`, `supabase.db.insert`, `openai.chat.complete`, `resend.send_email`. No `eval`, no `run_any`, no dynamic SQL construction from user input.

## Audit Principle
Every state-changing action (create memory, delete memory, AI suggestion accepted) is logged with actor, target, timestamp, and payload. Logs are append-only. No log entry is ever updated or deleted.

## Before Real Users
Complete the lock-down sprint (Sprint 4) before promoting the app to real users or collecting real family data.

## Milestone 2.0

`recipe-photos` is public-read; owner mutations require the caller's first-level `{auth.uid()}` folder and the recipe-photos bucket. Bucket limits are 6 MB and JPEG/PNG/WebP. Failed inserts attempt object cleanup. Turnstile uses only `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; its secret lives in Supabase Bot Protection. Distributed rate limiting is deferred to 2.0b. Normal Windows npm access worked; Codex's execution environment had TLS/credential limitations, with no SSL, registry, proxy, or certificate weakening.
