# Test Plan

## Primary Success Scenario (manual)
1. Open the homepage `/` — verify 5 recipe memory cards load with photos, titles, and author names.
2. Click any card — verify the `/memory/[id]` page shows the correct photo, title, recipe details, story, and author.
3. Click "Preserve a Recipe" on the homepage — verify `/create` loads with an empty form.
4. Attempt to hit Generate with all fields blank — verify inline errors appear on each required field.
5. Upload a photo > 10 MB — verify an error message appears before submission.
6. Upload a valid JPG/PNG, fill all fields, click Generate — verify redirect to `/memory/[id]`.
7. On the new memory page, verify all entered data displays correctly including the uploaded photo.
8. Click the copy-link button — verify a success toast appears.
9. Open the copied URL in a private/incognito window — verify the page loads correctly without any login prompt.
10. Paste the URL into a messaging app — verify OG preview shows the recipe photo and title.

## Empty States
- Delete all rows from `recipe_memories` — homepage shows "Be the first to preserve a recipe" empty state with CTA.
- Visit `/memory/[non-existent-id]` — verify a clear 404 / "Memory not found" message, not a blank page or crash.

## Error States
- Disconnect network mid-upload — verify a user-visible error message appears; form does not silently fail.
- Submit form with only whitespace in required fields — verify server-side validation rejects it.

## Lock-Down Regression (Sprint 4)
- Log in as User A, create a memory, copy the `id`.
- Log in as User B, attempt `DELETE /memory/[id]` — verify 403 / RLS rejection.
- Log out entirely, open `/memory/[id]` — verify page still loads (public share must survive).

## Milestone 2.0 status

Component/unit tests verify bootstrap idempotency, duplicate callback protection, child blocking, MIME validation, owner paths, omitted `user_id`, and navigation fallback. SQL inspection verifies migration clauses. Isolated Supabase integration still must verify User A/B RLS, NULL-owned rows, Storage isolation, bucket limits, ON DELETE SET NULL, and real Turnstile fresh-browser flow.
