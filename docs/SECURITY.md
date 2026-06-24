# Security — Recipes Are For Sharing

## Secret Handling
- Supabase service-role key: server-side only (Next.js API routes / Server Actions). Never in client bundle.
- Supabase anon key: client-safe, used with RLS enforced.
- No other secrets in v1.

## Permission Model
**v1 (demo-open):**
- All `recipe_memories` rows readable by anyone.
- Write open to anyone (no auth required) — enables frictionless demo.

**Lock-down sprint (before real users):**
- INSERT: requires `auth.uid()` — stored as `user_id`.
- UPDATE/DELETE: `auth.uid() = user_id` only.
- SELECT: remains public (shareable pages must be readable without login).

## Approved Tools Rule
- No `run_any` or `eval` patterns.
- File uploads go to Supabase Storage only — no third-party uploader with server-side secrets.
- Share link is a plain URL — no token or signed URL needed for public memory pages.

## Audit Principle
- Every create/update/delete of a `recipe_memory` emits an audit row (post lock-down sprint).
- Agent actions (email send, AI enhance) log action + user_id + object_id + timestamp before executing.