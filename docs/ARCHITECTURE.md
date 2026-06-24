# Architecture — Recipes Are For Sharing

## Stack
- **Frontend:** Next.js (App Router) on Vercel
- **Database + Storage:** Supabase (Postgres + Storage bucket for photos)
- **Styling:** Tailwind CSS

## What to Build Now vs Later
**Now:** create form → DB write → unique page render → share link copy
**Next:** user accounts, ownership, edit/delete, My Recipes library
**Later:** family collections, AI story enhancement, print-to-PDF, email sharing

## Key User Action — Step-by-Step
1. Visitor clicks 'Preserve a Recipe' on homepage
2. Form captures: photo, title, details, story, author name
3. Photo uploads to Supabase Storage; public URL returned
4. Form submits all fields → inserted as one row in `recipe_memories`
5. DB returns the new row's `id`
6. Browser navigates to `/memory/[id]` — the shareable Recipe Memory page
7. Page reads `recipe_memories` by `id` and renders photo, recipe, story, author
8. User copies the URL and shares it

## Layer Plan
1. **Data first:** `recipe_memories` table, Storage bucket, open RLS policies
2. **App logic:** create form, photo upload, memory page, share button
3. **Smart features (later):** AI story embellishment, og:image generation, PDF export

## Core Without AI
The entire create-and-share flow is pure form → DB → page render. No AI dependency in v1.