export const recipeMemoryFields = [
  "recipe_title",
  "recipe_details",
  "memory_story",
  "author_name",
] as const;

export type RecipeMemoryTextField = (typeof recipeMemoryFields)[number];
export type RecipeMemoryTextValues = Record<RecipeMemoryTextField, string>;

export function validateRecipeMemoryText(values: RecipeMemoryTextValues) {
  const errors: Partial<Record<RecipeMemoryTextField, string>> = {};
  for (const field of recipeMemoryFields) {
    if (!values[field].trim()) errors[field] = "This field is required.";
  }
  return errors;
}
