import { createElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const signInAnonymously = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { getUser, signInAnonymously } }) }));
import { AnonymousSessionBootstrap } from "@/components/auth/anonymous-session-bootstrap";

describe("AnonymousSessionBootstrap", () => {
  it("uses an existing session without creating another anonymous user", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-a" } }, error: null });
    render(createElement(AnonymousSessionBootstrap, null, createElement("p", null, "Create form")));
    expect(await screen.findByText("Create form")).toBeTruthy();
    expect(signInAnonymously).not.toHaveBeenCalled();
  });
  it("requires CAPTCHA before creating an anonymous session", async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site-key";
    let callback!: (token: string) => void;
    window.turnstile = { render: vi.fn((_target, options) => { callback = options.callback; return "widget"; }), reset: vi.fn(), remove: vi.fn() };
    getUser.mockResolvedValue({ data: { user: null }, error: { name: "AuthSessionMissingError" } });
    signInAnonymously.mockResolvedValue({ data: { user: { id: "user-a" } }, error: null });
    render(createElement(AnonymousSessionBootstrap, null, createElement("p", null, "Create form")));
    await screen.findByText("Complete the CAPTCHA to continue.");
    callback("token"); callback("token-again");
    await waitFor(() => expect(signInAnonymously).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Create form")).toBeTruthy();
  });
});
