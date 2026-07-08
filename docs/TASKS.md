# Tasks & Sprints

## Sprint 1 — Database + Core Recipe Memory Engine
**Goal:** A visitor can create a recipe memory and land on a live shareable URL backed by real data.

- [ ] Run migration SQL — `recipe_memories` table, RLS v1 open policies, 5 seed rows
- [ ] Supabase Storage bucket `recipe-photos` — public read
- [ ] `/create` page: photo upload field, recipe title, recipe details, memory/story, author name, Generate button
- [ ] Photo uploads to Supabase Storage on form submit → returns `photo_url`
- [ ] Form `INSERT`s into `recipe_memories` on submit — real DB write
- [ ] On success redirect to `/memory/[id]`
- [ ] `/memory/[id]` page: fetch row by id, display photo, title, details, story, author, share URL
- [ ] Loading skeleton on `/memory/[id]`
- [ ] 404 / error state if `id` not found
- [ ] Inline form validation: required fields, file type, max 10 MB

**Definition of Done:** Fill the form on `/create`, hit Generate, arrive at `/memory/[id]` URL that displays all entered data including the uploaded photo. Open that URL in a second browser tab — it loads correctly.

---

## Sprint 2 — Homepage & Demo Showcase
**Goal:** Anonymous visitor lands on a working homepage that shows real recipe memories and links to create one.

- [ ] `/` homepage: hero headline, sub-headline, "Preserve a Recipe" CTA button → `/create`
- [ ] Fetch all `recipe_memories` ordered by `created_at desc` — display as cards (photo thumbnail, title, author)
- [ ] Each card links to `/memory/[id]`
- [ ] Loading skeleton for card grid
- [ ] Empty state: "Be the first to preserve a recipe" with CTA
- [ ] Responsive grid layout (1 col mobile, 3 col desktop)

**Definition of Done:** Homepage loads with 5 seeded cards for anonymous visitor. Clicking a card opens the memory page. Clicking CTA opens the create form.

---

## Sprint 3 — Share UX, OG Previews & Polish ✅ v1 FUNCTIONAL MILESTONE
**Goal:** Sharing actually works — the link previews correctly and the end-to-end journey is polished.

- [ ] Copy-to-clipboard button on `/memory/[id]` with success toast
- [ ] Open Graph meta tags on `/memory/[id]`: `og:title`, `og:description`, `og:image` (photo_url)
- [ ] Photo upload progress bar
- [ ] Character counter on `memory_story` (encourage ≥ 100 words)
- [ ] Error toast on failed form submission
- [ ] Finalise mobile-responsive layout on all pages
- [ ] Manual test of full end-to-end journey (see TEST_PLAN.md)

**Definition of Done:** Share link copied on mobile. Pasted into iMessage / WhatsApp — preview shows recipe photo and title. Recipient taps link and reads the full memory page.

---

## Sprint 4 — Lock It Down (Auth + Per-User Ownership)
**Goal:** Creators own their memories; others cannot edit or delete them.

- [ ] Enable Supabase Auth — email magic link (+ optional Google OAuth)
- [ ] Login / signup pages at `/login`
- [ ] Capture `auth.uid()` as `user_id` on `INSERT` when user is logged in
- [ ] Replace open RLS write policy with `auth.uid() = user_id` for `insert/update/delete`; keep `select` open
- [ ] `/my-memories` dashboard — list logged-in user's memories with edit / delete
- [ ] Delete confirmation modal (soft-delete or hard-delete with confirmation)
- [ ] Redirect anonymous users from `/my-memories` to `/login`
- [ ] Regression test: public `/memory/[id]` URLs still work without login

**Definition of Done:** User A cannot delete User B's memory (403 returned). `/memory/[id]` loads without login. User A's dashboard shows only their memories.

---

## Gantt (approximate)
```
Sprint 1 — Week 1:   DB + core create/view engine
Sprint 2 — Week 1:   Homepage + demo cards
Sprint 3 — Week 2:   Share UX + OG + polish  ← v1 functional
Sprint 4 — Week 2+:  Auth + lock-down (before real users)
```
