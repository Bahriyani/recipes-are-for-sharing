# Data Model — Recipes Are For Sharing

## recipe_memories

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK, default gen_random_uuid() |
| user_id | uuid | Nullable — no FK yet; used for ownership at lock-down sprint |
| recipe_title | text | Required |
| recipe_details | text | Required — ingredients + method |
| memory_story | text | Required — personal memory/tradition |
| author_name | text | Required |
| photo_url | text | Public URL from Supabase Storage |
| created_at | timestamptz | Default now() |

### AI Fields (later)
When AI story embellishment is added:
- `story_enhanced`: text — AI-rewritten version of memory_story
- `story_enhanced_source`: text — e.g. `'openai/gpt-4o'`
- `story_enhanced_confidence`: numeric
- `story_enhanced_review_status`: text — default `'unreviewed'`

## Relationships
- Standalone in v1. No foreign keys yet.
- `user_id` added now as nullable; wired to `auth.users` at lock-down sprint.

## RLS (v1 — open for demo)
- SELECT: public (anyone can read any memory page)
- INSERT/UPDATE/DELETE: open in v1; restricted to `auth.uid() = user_id` at lock-down sprint

## Storage
- Bucket: `recipe-photos` — public read, authenticated write (relaxed to public write in v1)