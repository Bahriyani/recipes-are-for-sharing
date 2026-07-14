"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAnonymousSession } from "@/components/auth/anonymous-session-bootstrap";
import { createClient } from "@/lib/supabase/client";

const fields = ["recipe_title", "recipe_details", "memory_story", "author_name"] as const;
const imageExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
const maxPhotoBytes = 6 * 1024 * 1024;

type FormValues = Record<(typeof fields)[number], string>;

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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    fields.forEach((field) => {
      if (!values[field].trim()) nextErrors[field] = "This field is required.";
    });

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
      setStatus("");
      setErrors({ form: "We could not save your recipe memory. Please try again." });
      return;
    }

    router.push(`/memory/${data.id}`);
  }

  return <main className="shell narrow">
    <header><a className="brand" href="/">Recipes Are For Sharing</a></header>
    <h1>Preserve a recipe memory</h1>
    <p className="lede">Everything you need for a shareable family recipe.</p>
    <form onSubmit={submit} noValidate>
      {fields.map((field) => <label key={field}>
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
      <button className="button" disabled={Boolean(status)}>{status || "Generate recipe memory"}</button>
    </form>
  </main>;
}
