import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import EditForm from "./edit-form";
import { getRecipeMemory } from "@/lib/recipe-memories";

export default async function EditMemoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { memory, error, user, isOwner } = await getRecipeMemory(id);
  if (error || !memory) notFound();
  if (!user || !isOwner) redirect(`/memory/${id}`);

  return <main className="shell narrow">
    <header><Link className="brand" href={`/memory/${id}`}>Recipes Are For Sharing</Link></header>
    <h1>Edit recipe memory</h1>
    <p className="lede">Update the words that keep this family recipe close.</p>
    <EditForm id={id} values={{
      recipe_title: memory.recipe_title,
      recipe_details: memory.recipe_details,
      memory_story: memory.memory_story,
      author_name: memory.author_name,
    }} />
  </main>;
}
