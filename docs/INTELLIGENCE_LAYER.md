# Intelligence Layer

## Messy Input → Structured Output
Users type free-text into `recipe_details`. This may mix ingredients and method in any order or format.

### Auto-structure target (later)
```json
{
  "raw_recipe_details": "2 cans tomatoes, garlic. Fry garlic, add tomatoes, simmer 45 min.",
  "structured": {
    "ingredients": ["2 cans San Marzano tomatoes", "1 head garlic"],
    "method": ["Fry garlic in olive oil until golden", "Add crushed tomatoes", "Simmer 45 minutes"]
  },
  "source": "gpt-4o",
  "confidence": 0.91,
  "review_status": "unreviewed"
}
```

## Events to Track (later)
- `memory_created` — recipe memory submitted
- `memory_viewed` — `/memory/[id]` page opened
- `share_link_copied` — copy button clicked

## Scoring (later)
- **Completeness score** (rule-based): photo present +1, story > 100 words +1, recipe > 50 words +1. Max 3. Shown as a quality indicator.
- **Engagement** (later): view count, share clicks

## v1 vs Later
| v1 | Later |
|----|-------|
| All fields user-entered, no AI | AI story polish / caption suggestion |
| No scoring | Completeness score shown on create page |
| No event tracking | View + share analytics |
