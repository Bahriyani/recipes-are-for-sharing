import { createClient } from "@/lib/supabase/server";

export type RecipeMemory = {
  id: string;
  user_id: string | null;
  recipe_title: string;
  recipe_details: string;
  memory_story: string;
  author_name: string;
  photo_url: string | null;
  created_at: string;
};

export async function getRecipeMemory(id: string) {
  const supabase = await createClient();
  const [{ data: memory, error: memoryError }, { data: userData }] = await Promise.all([
    supabase.from("recipe_memories").select("id,user_id,recipe_title,recipe_details,memory_story,author_name,photo_url,created_at").eq("id", id).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  const user = userData.user;

  return {
    memory: (memory as RecipeMemory | null) ?? null,
    error: memoryError,
    user,
    isOwner: Boolean(memory && user && memory.user_id === user.id),
  };
}
