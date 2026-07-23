import { createElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const signInAnonymously = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { getUser, signInAnonymously } }) }));
import { AnonymousSessionBootstrap } from "@/components/auth/anonymous-session-bootstrap";

describe("AnonymousSessionBootstrap", () => {
  afterEach(() => {
    getUser.mockReset();
    signInAnonymously.mockReset();
    delete window.turnstile;
    vi.unstubAllEnvs();
  });

  it("uses an existing session without creating another anonymous user", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-a" } }, error: null });
    render(createElement(AnonymousSessionBootstrap, null, createElement("p", null, "Create form")));
    expect(await screen.findByText("Create form")).toBeTruthy();
    expect(signInAnonymously).not.toHaveBeenCalled();
  });
  it("requires CAPTCHA before creating an anonymous session", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
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

  it("skips CAPTCHA in local development when no site key is configured", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    getUser.mockResolvedValue({ data: { user: null }, error: { name: "AuthSessionMissingError" } });
    signInAnonymously.mockResolvedValue({ data: { user: { id: "local-user" } }, error: null });

    render(createElement(AnonymousSessionBootstrap, null, createElement("p", null, "Create form")));

    await waitFor(() => expect(signInAnonymously).toHaveBeenCalledTimes(1));
    expect(signInAnonymously).toHaveBeenCalledWith();
    expect(window.turnstile).toBeUndefined();
    expect(await screen.findByText("Create form")).toBeTruthy();
  });

  it("fails closed in production when no site key is configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    getUser.mockResolvedValue({ data: { user: null }, error: { name: "AuthSessionMissingError" } });

    render(createElement(AnonymousSessionBootstrap, null, createElement("p", null, "Create form")));

    expect(await screen.findByText("CAPTCHA is not configured. Please try again later.")).toBeTruthy();
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it("fails closed in development when Supabase is not local", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    getUser.mockResolvedValue({ data: { user: null }, error: { name: "AuthSessionMissingError" } });

    render(createElement(AnonymousSessionBootstrap, null, createElement("p", null, "Create form")));

    expect(await screen.findByText("Local development requires Supabase at http://127.0.0.1:54321 when CAPTCHA is disabled.")).toBeTruthy();
    expect(signInAnonymously).not.toHaveBeenCalled();
  });
});
