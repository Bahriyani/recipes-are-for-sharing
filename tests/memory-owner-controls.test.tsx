import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRecipeMemory: vi.fn(),
  updateRecipeMemory: vi.fn(),
}));

vi.mock("@/lib/recipe-memories", () => ({ getRecipeMemory: mocks.getRecipeMemory }));
vi.mock("./actions", () => ({ updateRecipeMemory: mocks.updateRecipeMemory }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }) }));

import MemoryPage from "@/app/memory/[id]/page";
import EditForm from "@/app/memory/[id]/edit/edit-form";
import { validateRecipeMemoryText } from "@/lib/recipe-memory-validation";

const memory = {
  id: "memory-1",
  user_id: "user-a",
  recipe_title: "Sunday Sauce",
  recipe_details: "Tomatoes and time",
  memory_story: "A family tradition",
  author_name: "Maria",
  photo_url: null,
  created_at: "2026-01-01T00:00:00Z",
};

describe("owner-aware memory controls", () => {
  beforeEach(() => {
    mocks.getRecipeMemory.mockReset();
    mocks.updateRecipeMemory.mockReset();
    mocks.updateRecipeMemory.mockResolvedValue({ fieldErrors: { recipe_title: "This field is required." } });
  });

  it("shows Edit only when the server-verified user owns the memory", async () => {
    mocks.getRecipeMemory.mockResolvedValue({ memory, error: null, user: { id: "user-a" }, isOwner: true });
    const ownerPage = await MemoryPage({ params: Promise.resolve({ id: memory.id }) });
    render(ownerPage);
    expect(screen.getByRole("link", { name: "Edit memory" }).getAttribute("href")).toBe("/memory/memory-1/edit");

    cleanup();
    mocks.getRecipeMemory.mockResolvedValue({ memory, error: null, user: { id: "user-b" }, isOwner: false });
    const nonOwnerPage = await MemoryPage({ params: Promise.resolve({ id: memory.id }) });
    render(nonOwnerPage);
    expect(screen.queryByRole("link", { name: "Edit memory" })).toBeNull();
  });

  it("preserves existing values and centralizes required-field validation", () => {
    render(<EditForm id={memory.id} values={memory} />);
    expect(screen.getByDisplayValue(memory.recipe_title)).toBeTruthy();
    expect(screen.getByDisplayValue(memory.recipe_details)).toBeTruthy();
    expect(validateRecipeMemoryText({ ...memory, recipe_title: "" })).toEqual({ recipe_title: "This field is required." });
  });
});
