# Agentic Layer — Recipes Are For Sharing

## v1: No Agents
All actions are direct user actions. No automated agents in v1.

## Action Risk Registry

| Action | Risk Level | v1? | Approval |
|---|---|---|---|
| Save recipe memory to DB | Low | ✅ | Auto (user submits form) |
| Upload photo to Storage | Low | ✅ | Auto |
| Copy share link | Low | ✅ | Auto |
| AI story embellishment draft | Low | Later | Auto-draft, user reviews |
| Send share email to family member | Medium | Later | User confirms before send |
| Delete recipe memory | High | Later | Owner confirms |
| Bulk export / archive all memories | High | Later | Owner confirms |

## Named Tools (later)
- `enhance_story(memory_story: string) → draft_text` — calls LLM, returns draft only
- `send_share_email(to: string, memory_id: uuid)` — sends one email after user confirms
- `delete_memory(memory_id: uuid)` — only callable by owner, logged

## Audit Log Fields (for all meaningful actions, later)
- `id`, `user_id`, `action`, `object_type`, `object_id`, `payload_snapshot`, `created_at`

## Principle
Agent inherits the logged-in user's permissions. No action executes without the owning user's identity. Every non-trivial mutation is logged.