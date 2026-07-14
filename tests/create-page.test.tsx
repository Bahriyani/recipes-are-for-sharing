import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userId: "user-a",
  replace: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/components/auth/anonymous-session-bootstrap", () => ({ useAnonymousSession: () => ({ userId: mocks.userId }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({
  storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove, getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage/${path}` } }) }) },
  from: () => ({ insert: mocks.insert }),
}) }));
import CreatePage from "@/app/create/page";

function fillRequired() {
  const inputs = screen.getAllByRole("textbox");
  inputs.forEach((input, index) => fireEvent.change(input, { target: { value: `value ${index}` } }));
}

describe("CreatePage", () => {
  beforeEach(() => {
    mocks.userId = "user-a";
    mocks.replace.mockReset(); mocks.upload.mockReset(); mocks.remove.mockReset(); mocks.insert.mockReset();
    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.insert.mockReturnValue({ select: () => ({ single: () => Promise.resolve({ data: { id: "uuid-1" }, error: null }) }) });
  });
  it("rejects invalid photo types without upload or insert", () => {
    render(<CreatePage />); fillRequired();
    fireEvent.change(screen.getByLabelText("Photo"), { target: { files: [new File(["x"], "x.gif", { type: "image/gif" })] } });
    fireEvent.submit(screen.getByRole("button"));
    expect(screen.getByText("Use a JPEG, PNG, or WebP image.")).toBeTruthy();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("uses owner path, MIME extension, omits user_id, and permanently locks success", async () => {
    vi.stubGlobal("crypto", { randomUUID: () => "object-id" });
    render(<CreatePage />); fillRequired();
    fireEvent.change(screen.getByLabelText("Photo"), { target: { files: [new File(["x"], "wrong.ext", { type: "image/png" })] } });
    fireEvent.submit(screen.getByRole("button"));
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledWith("user-a/object-id.png", expect.any(File), { contentType: "image/png" }));
    expect(mocks.insert).toHaveBeenCalledWith(expect.not.objectContaining({ user_id: expect.anything() }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/memory/uuid-1"));
    expect(screen.getByText("Open it now")).toBeTruthy();
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  });
});
