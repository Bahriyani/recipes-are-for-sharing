# Data Model

## recipe_memories

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `user_id` | uuid (nullable) | Owner — populated at lock-down sprint |
| `recipe_title` | text NOT NULL | e.g. "Nana's Sunday Tomato Sauce" |
| `recipe_details` | text NOT NULL | Ingredients + method, free text |
| `memory_story` | text NOT NULL | Personal story / tradition |
| `author_name` | text NOT NULL | e.g. "Maria Conti" |
| `photo_url` | text | Public Supabase Storage URL |
| `created_at` | timestamptz | `now()` |

### AI-generated fields (later sprint)
When an AI caption / story-polish is added:
- `ai_caption` text
- `ai_caption_source` text (model name + prompt version)
- `ai_caption_confidence` numeric
- `ai_caption_review_status` text default `'unreviewed'`

## RLS
- **v1 (demo):** permissive open policies — `select` and `all` for `true`
- **Lock-down sprint:** `select` stays open (public share URLs work); `insert/update/delete` scoped to `auth.uid() = user_id`

## Relationships
Standalone table in v1. No joins required. `user_id` FK added at lock-down sprint.
