import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRecipeMemory: vi.fn(),
  updateRecipeMemory: vi.fn(),
  deleteRecipeMemory: vi.fn(),
}));

vi.mock("@/lib/recipe-memories", () => ({ getRecipeMemory: mocks.getRecipeMemory }));
vi.mock("./actions", () => ({ updateRecipeMemory: mocks.updateRecipeMemory }));
vi.mock("./delete-action", () => ({ deleteRecipeMemory: mocks.deleteRecipeMemory }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }) }));

import MemoryPage from "@/app/memory/[id]/page";
import EditForm from "@/app/memory/[id]/edit/edit-form";
import DeleteButton from "@/app/memory/[id]/delete-button";
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

const assets = [
  { id: "asset-cover", public_url: "https://storage/cover.webp", is_cover: true, display_order: 0 },
  { id: "asset-second", public_url: "https://storage/second.webp", is_cover: false, display_order: 1 },
  { id: "asset-third", public_url: "https://storage/third.webp", is_cover: false, display_order: 2 },
];

describe("owner-aware memory controls", () => {
  beforeEach(() => {
    mocks.getRecipeMemory.mockReset();
    mocks.updateRecipeMemory.mockReset();
    mocks.deleteRecipeMemory.mockReset();
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
    expect(screen.queryByRole("button", { name: "Delete permanently" })).toBeNull();
  });

  it("renders one asset as the prominent cover", async () => {
    mocks.getRecipeMemory.mockResolvedValue({ memory, assets: [assets[0]], error: null, user: null, isOwner: false });
    render(await MemoryPage({ params: Promise.resolve({ id: memory.id }) }));
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("img").getAttribute("src")).toContain("cover.webp");
    expect(screen.queryByRole("region", { name: "Recipe photo gallery" })).toBeNull();
  });

  it("renders multiple assets in display order with one prominent cover", async () => {
    mocks.getRecipeMemory.mockResolvedValue({ memory, assets, error: null, user: null, isOwner: false });
    render(await MemoryPage({ params: Promise.resolve({ id: memory.id }) }));
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(3);
    expect(images.map((image) => image.getAttribute("src"))).toEqual([
      expect.stringContaining("cover.webp"),
      expect.stringContaining("second.webp"),
      expect.stringContaining("third.webp"),
    ]);
    expect(screen.getByRole("region", { name: "Recipe photo gallery" })).toBeTruthy();
  });

  it("uses legacy photo_url only when no assets exist", async () => {
    const legacy = { ...memory, photo_url: "https://storage/legacy.webp" };
    mocks.getRecipeMemory.mockResolvedValue({ memory: legacy, assets: [], error: null, user: null, isOwner: false });
    render(await MemoryPage({ params: Promise.resolve({ id: memory.id }) }));
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("img").getAttribute("src")).toContain("legacy.webp");
  });

  it("renders no image or gallery when neither assets nor legacy photo exists", async () => {
    mocks.getRecipeMemory.mockResolvedValue({ memory, assets: [], error: null, user: null, isOwner: false });
    render(await MemoryPage({ params: Promise.resolve({ id: memory.id }) }));
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(screen.queryByRole("region", { name: "Recipe photo gallery" })).toBeNull();
  });

  it("shows a permanent delete control only to the verified owner", async () => {
    mocks.getRecipeMemory.mockResolvedValue({ memory, error: null, user: { id: "user-a" }, isOwner: true });
    const ownerPage = await MemoryPage({ params: Promise.resolve({ id: memory.id }) });
    render(ownerPage);
    expect(screen.getByRole("button", { name: "Delete permanently" })).toBeTruthy();

    cleanup();
    mocks.getRecipeMemory.mockResolvedValue({ memory, error: null, user: { id: "user-b" }, isOwner: false });
    const nonOwnerPage = await MemoryPage({ params: Promise.resolve({ id: memory.id }) });
    render(nonOwnerPage);
    expect(screen.queryByRole("button", { name: "Delete permanently" })).toBeNull();
  });

  it("requires confirmation before submitting deletion", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<DeleteButton id={memory.id} />);
    screen.getByRole("button", { name: "Delete permanently" }).click();
    expect(mocks.deleteRecipeMemory).not.toHaveBeenCalled();
  });

  it("preserves existing values and centralizes required-field validation", () => {
    render(<EditForm id={memory.id} values={memory} />);
    expect(screen.getByDisplayValue(memory.recipe_title)).toBeTruthy();
    expect(screen.getByDisplayValue(memory.recipe_details)).toBeTruthy();
    expect(validateRecipeMemoryText({ ...memory, recipe_title: "" })).toEqual({ recipe_title: "This field is required." });
  });
});
