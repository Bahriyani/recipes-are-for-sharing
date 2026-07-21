"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  recipeMemoryFields,
  type RecipeMemoryTextField,
  type RecipeMemoryTextValues,
  validateRecipeMemoryText,
} from "@/lib/recipe-memory-validation";

export type EditMemoryState = {
  formError?: string;
  fieldErrors?: Partial<Record<RecipeMemoryTextField, string>>;
};

function readTextValues(formData: FormData): RecipeMemoryTextValues {
  return Object.fromEntries(
    recipeMemoryFields.map((field) => [field, String(formData.get(field) ?? "")]),
  ) as RecipeMemoryTextValues;
}

export async function updateRecipeMemory(
  id: string,
  _previousState: EditMemoryState,
  formData: FormData,
): Promise<EditMemoryState> {
  const values = readTextValues(formData);
  const fieldErrors = validateRecipeMemoryText(values);
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { formError: "You must be signed in as the owner to edit this memory." };

  const { data: memory, error: fetchError } = await supabase
    .from("recipe_memories")
    .select("id,user_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return { formError: "We could not verify this memory. Please try again." };
  if (!memory) return { formError: "This memory could not be found." };
  if (memory.user_id !== user.id) return { formError: "You are not allowed to edit this memory." };

  const { data: updated, error: updateError } = await supabase
    .from("recipe_memories")
    .update(values)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (updateError || !updated) return { formError: "We could not save your changes. Please try again." };

  revalidatePath(`/memory/${id}`);
  redirect(`/memory/${id}`);
}
