# Test Plan — Recipes Are For Sharing

## Success Scenario (manual, end-to-end)
1. Open homepage at `/` — confirm hero, CTA button, and sample memories grid are visible.
2. Click 'Preserve a Recipe' — confirm navigation to `/create`.
3. Upload a photo (JPG < 5MB) — confirm preview appears in form.
4. Enter recipe title: `Grandma's Apple Cake`
5. Enter recipe details: `200g flour, 3 apples... Mix and bake 180°C 40 min.`
6. Enter memory/story: `She made this every autumn when we visited.`
7. Enter author name: `Sarah Chen`
8. Click 'Generate' — confirm loading state appears.
9. Confirm navigation to `/memory/[id]` with correct data: photo, title, recipe, story, author.
10. Click 'Copy Share Link' — confirm 'Copied!' feedback.
11. Open the copied URL in an incognito window — confirm page loads with full memory (no login required).
12. Confirm new memory appears in homepage sample grid on next load.

## Empty / Edge Cases
- Submit form with missing required field → field-level error message shown, no DB write.
- Submit without photo → form accepts it; memory page shows placeholder/no image gracefully.
- Navigate to `/memory/nonexistent-id` → friendly 'Memory not found' error page.
- Homepage with zero rows in DB → empty state message shown (not a crash).
- Upload a file > 10MB → error message 'Photo must be under 10MB'.
- Very long recipe details (5000 chars) → page renders without layout break.

## Regression Checks (after each sprint)
- Seeded demo rows still appear on homepage.
- Create flow still persists to DB (not just local state).
- Memory page URL still resolves after Sprint 3 style changes.
- After Sprint 4 auth: incognito user can still view a memory page at its URL.