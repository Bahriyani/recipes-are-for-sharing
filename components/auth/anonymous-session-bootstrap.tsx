"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "checking" | "captcha" | "creating" | "ready" | "error";
type AnonymousSessionContextValue = {
  status: Status;
  error: string | null;
  userId: string | null;
  retry: () => void;
};

const AnonymousSessionContext = createContext<AnonymousSessionContextValue | null>(null);
const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstile() {
  return new Promise<void>((resolve, reject) => {
    if (window.turnstile) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load CAPTCHA.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load CAPTCHA."));
    document.head.appendChild(script);
  });
}

export function AnonymousSessionBootstrap({ children }: { children: React.ReactNode }) {
  const target = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const isRenderingCaptcha = useRef(false);
  const isSigningIn = useRef(false);
  const initializationVersion = useRef(0);
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const resetCaptcha = useCallback(() => {
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
  }, []);

  const establishSession = useCallback(async (captchaToken: string) => {
    if (isSigningIn.current) return;
    isSigningIn.current = true;
    setStatus("creating");
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInAnonymously({
        options: { captchaToken },
      });
      if (signInError || !data.user) {
        setStatus("error");
        setError(signInError?.message ?? "CAPTCHA was rejected. Please try again.");
        resetCaptcha();
        return;
      }
      setUserId(data.user.id);
      setStatus("ready");
    } catch {
      setStatus("error");
      setError("We could not create your session. Please try again.");
      resetCaptcha();
    } finally {
      isSigningIn.current = false;
    }
  }, [resetCaptcha]);

  const renderCaptcha = useCallback(async () => {
    if (!siteKey) {
      setStatus("error");
      setError("CAPTCHA is not configured. Please try again later.");
      return;
    }
    if (widgetId.current) {
      resetCaptcha();
      setStatus("captcha");
      return;
    }
    if (isRenderingCaptcha.current) return;
    isRenderingCaptcha.current = true;
    const version = initializationVersion.current;
    try {
      await loadTurnstile();
      if (version !== initializationVersion.current || !target.current || widgetId.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(target.current, {
        sitekey: siteKey,
        callback: establishSession,
        "expired-callback": () => {
          setStatus("captcha");
          setError("CAPTCHA expired. Please complete it again.");
          resetCaptcha();
        },
        "error-callback": () => {
          setStatus("error");
          setError("CAPTCHA could not be verified. Please try again.");
        },
      });
      setStatus("captcha");
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Unable to load CAPTCHA.");
    } finally {
      if (version === initializationVersion.current) isRenderingCaptcha.current = false;
    }
  }, [establishSession, resetCaptcha, siteKey]);

  const checkSession = useCallback(async () => {
    setStatus("checking");
    setError(null);
    const supabase = createClient();
    const { data, error: sessionError } = await supabase.auth.getUser();
    if (data.user) {
      setUserId(data.user.id);
      setStatus("ready");
      return;
    }
    if (sessionError && sessionError.name !== "AuthSessionMissingError") {
      setStatus("error");
      setError("We could not verify your session. Please try again.");
      return;
    }
    await renderCaptcha();
  }, [renderCaptcha]);

  useEffect(() => { void checkSession(); }, [checkSession]);
  useEffect(() => () => {
    initializationVersion.current += 1;
    isRenderingCaptcha.current = false;
    if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
    widgetId.current = null;
  }, []);

  const retry = () => { resetCaptcha(); void checkSession(); };
  return <AnonymousSessionContext.Provider value={{ status, error, userId, retry }}>
    {status === "ready" ? children : <aside className="auth-status" aria-live="polite">
      {status === "checking" && <p>Preparing your private recipe space…</p>}
      {status === "creating" && <p>Creating your secure session…</p>}
      {status === "captcha" && <p>Complete the CAPTCHA to continue.</p>}
      {error && <><p className="field-error">{error}</p><button className="button secondary" type="button" onClick={retry}>Try again</button></>}
      <div ref={target} />
    </aside>}
  </AnonymousSessionContext.Provider>;
}

export function useAnonymousSession() {
  const context = useContext(AnonymousSessionContext);
  if (!context) throw new Error("useAnonymousSession must be used within AnonymousSessionBootstrap.");
  return context;
}
