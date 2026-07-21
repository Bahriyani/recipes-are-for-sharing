"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAnonymousSession } from "@/components/auth/anonymous-session-bootstrap";
import { createClient } from "@/lib/supabase/client";
import { recipeMemoryFields, validateRecipeMemoryText } from "@/lib/recipe-memory-validation";

const imageExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
const maxPhotoBytes = 6 * 1024 * 1024;

type FormValues = Record<(typeof recipeMemoryFields)[number], string>;

export default function CreatePage() {
  const router = useRouter();
  const { userId } = useAnonymousSession();
  const [values, setValues] = useState<FormValues>({
    recipe_title: "",
    recipe_details: "",
    memory_story: "",
    author_name: "",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [createdMemoryId, setCreatedMemoryId] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmittingRef.current) return;
    const nextErrors: Record<string, string> = { ...validateRecipeMemoryText(values) };

    if (!userId) {
      nextErrors.session = "Your private session is unavailable. Please refresh and try again.";
    }

    const extension = photo ? imageExtensions[photo.type as keyof typeof imageExtensions] : undefined;
    if (photo && !extension) nextErrors.photo = "Use a JPEG, PNG, or WebP image.";
    if (photo && photo.size > maxPhotoBytes) nextErrors.photo = "Use an image smaller than 6 MB.";

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    if (!userId) return;

    isSubmittingRef.current = true;
    setErrors({});
    setStatus("Creating your memory…");
    const supabase = createClient();
    let storagePath: string | undefined;
    let photoUrl: string | undefined;

    if (photo && extension) {
      storagePath = `${userId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("recipe-photos")
        .upload(storagePath, photo, { contentType: photo.type });

      if (uploadError) {
        isSubmittingRef.current = false;
        setStatus("");
        setErrors({ photo: "We could not upload your photo. Please try again." });
        return;
      }

      photoUrl = supabase.storage.from("recipe-photos").getPublicUrl(storagePath).data.publicUrl;
    }

    const { data, error: insertError } = await supabase
      .from("recipe_memories")
      .insert({ ...values, photo_url: photoUrl })
      .select("id")
      .single();

    if (insertError || !data) {
      if (storagePath) {
        const { error: cleanupError } = await supabase.storage.from("recipe-photos").remove([storagePath]);
        if (cleanupError) {
          console.error("[recipe-memory/create] upload cleanup failed", {
            message: cleanupError.message,
          });
        }
      }
      isSubmittingRef.current = false;
      setStatus("");
      setErrors({ form: "We could not save your recipe memory. Please try again." });
      return;
    }

    setCreatedMemoryId(data.id);
    setStatus("Memory created. Opening it…");
    router.replace(`/memory/${data.id}`);
  }

  return <main className="shell narrow">
    <header><a className="brand" href="/">Recipes Are For Sharing</a></header>
    <h1>Preserve a recipe memory</h1>
    <p className="lede">Everything you need for a shareable family recipe.</p>
    <form onSubmit={submit} noValidate>
      {recipeMemoryFields.map((field) => <label key={field}>
        {field === "recipe_title" ? "Recipe title" : field === "recipe_details" ? "Recipe details (ingredients and method)" : field === "memory_story" ? "The memory behind it" : "Your name"}
        {field === "recipe_details" || field === "memory_story"
          ? <textarea value={values[field]} onChange={(event) => setValues({ ...values, [field]: event.target.value })} />
          : <input value={values[field]} onChange={(event) => setValues({ ...values, [field]: event.target.value })} />}
        {errors[field] && <span className="field-error">{errors[field]}</span>}
        {field === "memory_story" && <small>{values.memory_story.trim() ? values.memory_story.trim().split(/\s+/).length : 0} words · 100+ is a lovely keepsake</small>}
      </label>)}
      <label>Photo
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} />
        {errors.photo && <span className="field-error">{errors.photo}</span>}
      </label>
      {errors.session && <p className="notice error">{errors.session}</p>}
      {errors.form && <p className="notice error">{errors.form}</p>}
      {createdMemoryId && <p className="notice">Your memory is ready. <a href={`/memory/${createdMemoryId}`}>Open it now</a>.</p>}
      <button className="button" disabled={Boolean(status)}>{status || "Generate recipe memory"}</button>
    </form>
  </main>;
}
