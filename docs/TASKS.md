# Tasks — Recipes Are For Sharing

## Sprint 1 — Database & Core Engine
**Goal:** The one core action works end-to-end: create a recipe memory, persist it, view it at a unique URL.

- [ ] Create `recipe_memories` table (migration SQL)
- [ ] Create `recipe-photos` Supabase Storage bucket (public)
- [ ] Seed 4 demo recipe memories with real photo URLs
- [ ] Build `/create` page with form: photo upload, title, details, story, author name
- [ ] Wire photo upload to Supabase Storage → store public URL
- [ ] Wire form submit → INSERT into `recipe_memories`
- [ ] On success, navigate to `/memory/[id]`
- [ ] Build `/memory/[id]` page: reads row by id, renders photo, recipe, story, author
- [ ] Confirm full create → save → view flow works against live DB

**Definition of Done:** A tester fills the form, submits, and lands on a real rendered memory page with their data. The row exists in Supabase.

---

## Sprint 2 — Homepage & Share Flow ✦ v1 functional milestone
**Goal:** The app is demoable from the homepage. Sharing works.

- [ ] Build `/` homepage: hero copy, 'Preserve a Recipe' button → `/create`
- [ ] Sample memories grid on homepage pulls live rows from `recipe_memories`
- [ ] Share link copy button on `/memory/[id]` with 'Copied!' confirmation
- [ ] Loading skeleton states on homepage grid and memory page
- [ ] Empty state on homepage if no memories yet
- [ ] Error state if memory id not found
- [ ] Success screen after create with share link displayed

**Definition of Done:** Anonymous visitor completes the full journey — homepage → create → memory page → copy link — in under 3 minutes. ✦ **v1 functional**

---

## Sprint 3 — Polish & Emotional Design
**Goal:** The app feels warm, trustworthy, and share-worthy.

- [ ] Styled memory page: full-bleed photo hero, recipe block, story block, author line
- [ ] Form validation with human-friendly error messages
- [ ] Mobile-responsive layouts on all pages
- [ ] `og:image`, `og:title`, `og:description` meta tags on memory pages (rich link previews)
- [ ] Favicon and page `<title>` tags
- [ ] Typography and colour palette conveying warmth/family

**Definition of Done:** Memory page looks beautiful on mobile. Sharing the URL in iMessage shows a rich preview card.

---

## Sprint 4 — Lock It Down (Auth + Ownership)
**Goal:** Real users can own, edit, and delete their memories. Open policies replaced.

- [ ] Add Supabase Auth (email/password)
- [ ] Sign-up and login pages
- [ ] Attach `user_id` to new `recipe_memories` on create (when logged in)
- [ ] Replace v1 open RLS policies with owner-scoped write policies
- [ ] My Recipes page `/my-recipes` — lists user's own memories
- [ ] Edit memory page (owner only)
- [ ] Delete memory (owner only, confirm dialog)
- [ ] Unauthenticated users can still view any memory page (SELECT stays public)

**Definition of Done:** User A cannot edit User B's memory. All write paths require auth. Shareable memory pages still load without login.

---

## Gantt (sprint → feature)
```
Sprint 1: DB schema, seed data, create form, memory page
Sprint 2: Homepage, share button, loading/error states  ← v1 functional
Sprint 3: Polish, mobile, OG meta, emotional design
Sprint 4: Auth, ownership, RLS lock-down, edit/delete
```