import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Memory = { id: string; recipe_title: string; author_name: string; photo_url: string | null };

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("recipe_memories").select("id,recipe_title,author_name,photo_url").order("created_at", { ascending: false });
  if (error) {
    const hostname = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : null;
    console.error("[recipe-memories/home-query]", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      environment: {
        supabaseUrlPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        supabaseAnonKeyPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        hostname,
      },
    });
  }
  return <main className="shell"><header><Link href="/" className="brand">Recipes Are For Sharing</Link><Link className="button" href="/create">Preserve a Recipe</Link></header><section className="hero"><p className="eyebrow">A place for family food stories</p><h1>Keep the recipes that mean something close.</h1><p>Preserve a dish, the story behind it, and a link your family can share.</p><Link className="button" href="/create">Preserve a Recipe</Link></section><section><h2>Recipe memories</h2>{error ? <p className="notice error">We could not load recipe memories. Please try again.</p> : data?.length ? <div className="grid">{(data as Memory[]).map((memory) => <Link key={memory.id} href={`/memory/${memory.id}`} className="card">{memory.photo_url ? <img src={memory.photo_url} alt="" /> : <div className="placeholder">Recipe memory</div>}<div><h3>{memory.recipe_title}</h3><p>{memory.author_name}</p></div></Link>)}</div> : <div className="empty"><p>Be the first to preserve a recipe.</p><Link className="button" href="/create">Create a recipe memory</Link></div>}</section></main>;
}
