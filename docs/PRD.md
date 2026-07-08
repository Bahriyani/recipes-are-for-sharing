# Product Requirements — Recipes Are For Sharing

## Problem
Family recipes, stories, and food traditions disappear when older generations do. There is no simple way for a non-technical person to preserve a recipe *and* the memory behind it in one shareable place.

## Target User
Families, home cooks, grandparents, parents, and food enthusiasts who want to honour a culinary tradition before it is lost.

## Core Object
**Recipe Memory** — a single page combining a recipe (photo, title, method/ingredients) with the personal story or family tradition behind it, accessible via a public URL.

## MVP Checklist (v1 must-haves)
- [ ] Homepage with hero headline, "Preserve a Recipe" CTA, and sample recipe memories
- [ ] Create Recipe Memory form: photo upload, recipe title, recipe details, memory/story, author name
- [ ] Form persists to database on submit — no dead buttons
- [ ] Auto-generated public `/memory/[id]` page showing all fields
- [ ] Shareable URL visible on the recipe memory page
- [ ] Works for anonymous visitors — no login required
- [ ] Loading, empty, and error states handled on every screen

## Non-Goals (v1)
Social network, comments, likes, following, user accounts (Sprint 1–2), mobile apps, marketplace, payments, AI recommendations, meal planning, family archives, external integrations.

## Success Criteria
A first-time visitor arrives at the homepage, clicks "Preserve a Recipe", fills in the form (with a photo), hits Generate, and lands on a shareable `/memory/[id]` URL — all within 3 minutes, with no account required. Pass = the URL opens the correct recipe memory on a second device.
