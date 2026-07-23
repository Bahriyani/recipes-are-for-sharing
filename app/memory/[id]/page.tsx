import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ShareButton from "./share-button";
import DeleteButton from "./delete-button";
import { getRecipeMemory } from "@/lib/recipe-memories";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { memory } = await getRecipeMemory((await params).id);
  return memory
    ? { title: `${memory.recipe_title} | Recipes Are For Sharing`, description: memory.memory_story.slice(0, 160), openGraph: { title: memory.recipe_title, description: memory.memory_story.slice(0, 160), images: memory.photo_url ? [memory.photo_url] : [] } }
    : { title: "Memory not found" };
}

export default async function MemoryPage({ params }: Props) {
  const { memory, isOwner, assets = [] } = await getRecipeMemory((await params).id);
  if (!memory) notFound();
  const cover = assets.find((asset) => asset.is_cover) ?? assets[0];
  const coverUrl = cover?.public_url ?? memory.photo_url;
  const remainingAssets = cover ? assets.filter((asset) => asset.id !== cover.id) : [];
  return <main className="shell narrow"><header><Link className="brand" href="/">Recipes Are For Sharing</Link></header>{coverUrl && <img className="memory-photo" src={coverUrl} alt={`Photo of ${memory.recipe_title}`} />}{remainingAssets.length > 0 && <section className="memory-gallery" aria-label="Recipe photo gallery"><h2>More photos</h2><div className="memory-gallery-grid">{remainingAssets.map((asset, index) => <img key={asset.id} src={asset.public_url} alt={`${memory.recipe_title} photo ${index + 2}`} loading="lazy" />)}</div></section>}<p className="eyebrow">Shared by {memory.author_name}</p><h1>{memory.recipe_title}</h1><div className="actions">{isOwner && <Link className="button secondary" href={`/memory/${memory.id}/edit`}>Edit memory</Link>}{isOwner && <DeleteButton id={memory.id} />}<ShareButton /></div><section><h2>The recipe</h2><p className="preserve">{memory.recipe_details}</p></section><section><h2>The memory</h2><p className="preserve story">{memory.memory_story}</p></section></main>;
}
