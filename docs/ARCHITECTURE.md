# Architecture

## Stack
- **Frontend:** Next.js 14 (App Router) — hosted on Vercel
- **Database + Auth:** Supabase (Postgres + RLS)
- **Storage:** Supabase Storage (recipe photos)
- **Styling:** Tailwind CSS

## Now vs Later
| Now | Later |
|-----|-------|
| Anonymous recipe memory creation | User accounts + "My Memories" dashboard |
| Public shareable `/memory/[id]` page | Owner-scoped edit / delete |
| Photo upload to Supabase Storage | PDF / print export |
| Homepage with seeded demo cards | Email a memory, family collections |
| OG meta tags for social sharing | AI story-polish suggestions |

## Key User Action — Step by Step
1. Visitor hits `/create` and fills the form
2. Photo is uploaded to Supabase Storage → returns a public `photo_url`
3. Form fields + `photo_url` are `INSERT`ed into `recipe_memories`
4. Server returns the new row's `id`
5. Browser navigates to `/memory/[id]`
6. Page fetches the row by `id` and renders photo, recipe, story, author
7. Share link (`window.location.href`) is displayed and copyable

## Layer Plan
1. **Data first** — table + RLS + seed rows
2. **App logic** — form → insert → page render (works with AI off)
3. **Smart features** — OG previews, AI story suggestions (later)

## Why the Core Runs Without AI
Every field is user-supplied. No AI field is required to create or display a recipe memory. AI features are additive and clearly marked for later sprints.

## Anonymous ownership

`/create` establishes or reuses a cookie-backed Supabase Anonymous Auth session before rendering its form. Cloudflare Turnstile protects new sign-ins; no custom auth API route is used. `@supabase/ssr` browser/server clients and middleware maintain the session. Public memory pages remain unauthenticated. New photos use `{auth.uid()}/{random-uuid}.{validated-extension}`.
