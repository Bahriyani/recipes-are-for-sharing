"use client";

import { FormEvent, useEffect, useRef } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  recipeMemoryFields,
  type RecipeMemoryTextField,
  type RecipeMemoryTextValues,
} from "@/lib/recipe-memory-validation";
import { updateRecipeMemory, type EditMemoryState } from "./actions";

const initialState: EditMemoryState = {};
const labels: Record<RecipeMemoryTextField, string> = {
  recipe_title: "Recipe title",
  recipe_details: "Recipe details (ingredients and method)",
  memory_story: "The memory behind it",
  author_name: "Your name",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button className="button" disabled={pending}>{pending ? "Saving changes…" : "Save changes"}</button>;
}

export default function EditForm({ id, values }: { id: string; values: RecipeMemoryTextValues }) {
  const [state, formAction] = useActionState(updateRecipeMemory.bind(null, id), initialState);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (state.formError || state.fieldErrors) isSubmittingRef.current = false;
  }, [state]);

  function preventDuplicateSubmit(event: FormEvent<HTMLFormElement>) {
    if (isSubmittingRef.current) {
      event.preventDefault();
      return;
    }
    isSubmittingRef.current = true;
  }

  return <form action={formAction} onSubmit={preventDuplicateSubmit} noValidate>
    {recipeMemoryFields.map((field) => <label key={field}>
      {labels[field]}
      {field === "recipe_details" || field === "memory_story"
        ? <textarea name={field} defaultValue={values[field]} />
        : <input name={field} defaultValue={values[field]} />}
      {state.fieldErrors?.[field] && <span className="field-error">{state.fieldErrors[field]}</span>}
    </label>)}
    {state.formError && <p className="notice error" role="alert">{state.formError}</p>}
    <SubmitButton />
  </form>;
}
