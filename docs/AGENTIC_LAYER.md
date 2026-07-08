# Agentic Layer

## v1 — No Agentic Actions
v1 is a simple create-and-share tool. All writes are direct user actions.

## Risk Register (for later sprints)

### Low risk — auto-execute
- **Suggest story improvements:** AI rewrites a draft story for warmth/length. Value + source + confidence + review_status stored. User accepts or discards.
- **Auto-tag cuisine type:** rule-based keyword match on `recipe_details`.

### Medium risk — show draft, user approves
- **Email memory to a recipient:** draft email preview shown; user clicks Send.
- **Generate PDF:** system drafts layout, user downloads after preview.

### High risk — explicit user confirmation required
- **Delete a recipe memory:** confirmation modal required; soft-delete with 30-day recovery window.

### Critical — human only (never automated)
- Permanent deletion of user data
- Any action that touches data belonging to another user

## Named Tools (later)
- `supabase.storage.upload` — photo upload (v1 already)
- `openai.chat.complete` — story suggestion
- `resend.send_email` — share by email

## Audit Log Fields (later)
`id`, `action`, `actor_user_id`, `target_id`, `target_table`, `payload_json`, `created_at`

Every meaningful write (create, delete, AI suggestion accepted) appended — never updated.
