# Intelligence Layer — Recipes Are For Sharing

## v1: No AI (Core Runs Without It)
The create → share flow is entirely user-driven. No AI in v1.

## Messy Inputs (what users actually type)
- Recipe details: informal prose, mixed units, missing steps, colloquial language
- Memory/story: emotional, fragmented, non-linear — this is the value, not a problem to fix

## Auto-Structure Schema (for later AI parsing)
```json
{
  "recipe_title": "Nonna's Sunday Ragù",
  "ingredients": ["500g beef mince", "1 onion", "400g crushed tomatoes"],
  "method_steps": ["Sauté onion", "Brown mince", "Simmer 3 hours"],
  "story_summary": "Sunday family tradition, started after church.",
  "story_enhanced": "Every Sunday morning...",
  "story_enhanced_source": "openai/gpt-4o",
  "story_enhanced_confidence": 0.91,
  "story_enhanced_review_status": "unreviewed"
}
```

## Events to Track (for later ranking)
- `memory_created` — timestamp, author name present, photo attached (y/n)
- `share_link_copied` — recipe memory id
- `memory_page_viewed` — recipe memory id, referrer

## v1 vs Later
- **v1:** rule-based required-field validation only
- **Next:** AI story embellishment (low-risk, auto-draft, user reviews before publish)
- **Later:** ingredient parser, recipe card formatter, similarity scoring across memories