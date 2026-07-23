"use client";

import { FormEvent, useEffect, useRef } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { deleteRecipeMemory, type DeleteMemoryState } from "./delete-action";

const initialState: DeleteMemoryState = {};

function DeleteSubmitButton() {
  const { pending } = useFormStatus();
  return <button className="button danger" type="submit" disabled={pending}>{pending ? "Deleting…" : "Delete permanently"}</button>;
}

export default function DeleteButton({ id }: { id: string }) {
  const [state, formAction] = useActionState(deleteRecipeMemory.bind(null, id), initialState);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (state.formError) isSubmittingRef.current = false;
  }, [state]);

  function confirmDeletion(event: FormEvent<HTMLFormElement>) {
    if (isSubmittingRef.current) {
      event.preventDefault();
      return;
    }
    if (!window.confirm("Delete this Recipe Memory permanently? This cannot be undone.")) {
      event.preventDefault();
      return;
    }
    isSubmittingRef.current = true;
  }

  return <form action={formAction} onSubmit={confirmDeletion}>
    {state.formError && <p className="notice error" role="alert">{state.formError}</p>}
    <DeleteSubmitButton />
  </form>;
}
