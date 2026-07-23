# Anonymous Auth and Turnstile setup

This guide configures the existing Anonymous Auth bootstrap. It does not change
recipe assets, ownership rules, Storage policies, or gallery behaviour.

## Variables

The browser/server clients use these public variables:

| Variable | Local development | Vercel Preview/Production |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase CLI API URL (`http://127.0.0.1:54321`) | The existing project URL (`https://<project-ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The local `ANON_KEY` from `supabase status -o env` | The existing project anon key |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Empty; local Auth CAPTCHA is disabled | The public site key for the matching Cloudflare widget |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | The preview or production application URL |

Only the `NEXT_PUBLIC_*` values belong in Vercel or a local environment file.
They are public browser configuration, not secrets. Never commit real values.
The Turnstile secret is never a Vercel variable and never belongs in this
repository.

`.env.example` contains placeholders only. Local secret files such as
`.env.local` and `.env.development.local` remain ignored by Git.

## Cloudflare Turnstile

1. In the Cloudflare dashboard, open Turnstile and create a widget for the RFS
   application.
2. Add every hostname that will be tested: `localhost`, `127.0.0.1` only when
   using a configured local widget, the Vercel preview hostname, and the final
   production hostname.
3. Choose the widget mode required by the product (managed is the normal
   choice), then copy the widget's **site key** into
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY` for the corresponding remote environment.
4. Keep the widget's **secret key** private. In Supabase Dashboard, open
   Authentication → Bot and Abuse Protection (CAPTCHA), enable CAPTCHA, select
   Cloudflare Turnstile, and paste the secret there. Do not paste it into
   Vercel, `.env.local`, browser code, or a migration.

Use separate Cloudflare widgets/keys for local, preview, and production when
their hostname policies differ. A remote environment must use a site key that
belongs to a widget allowing that environment's hostname.

## Local development

Local Supabase intentionally has Anonymous Sign-Ins enabled and CAPTCHA
disabled. Start the disposable stack, then run:

```text
supabase start
npm.cmd run dev
```

`npm.cmd run dev` reads the local URL and anon key from `supabase status -o env`
and explicitly clears `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. This prevents a
production `.env.local` value from leaking into the local browser bundle.

The bootstrap permits a no-CAPTCHA anonymous sign-in only when `NODE_ENV` is
development and the configured Supabase hostname is `127.0.0.1` or `localhost`
on port `54321`. If either condition is false, it fails closed.

No local Turnstile secret is required or permitted.

## Vercel Preview

In Vercel → Project → Settings → Environment Variables, set for **Preview**:

```text
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<existing-project-anon-key>
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<preview-widget-site-key>
NEXT_PUBLIC_APP_URL=https://<preview-hostname>
```

In Supabase Authentication, enable Anonymous Sign-Ins and CAPTCHA/Bot
Protection with the matching Turnstile secret. Redeploy after changing
variables. Preview must never point at the disposable local API.

## Production

In Vercel → Project → Settings → Environment Variables, set for **Production**:

```text
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<existing-project-anon-key>
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<production-widget-site-key>
NEXT_PUBLIC_APP_URL=https://<production-hostname>
```

In the existing Supabase project:

- enable Anonymous Sign-Ins;
- enable CAPTCHA/Bot Protection;
- select Cloudflare Turnstile;
- store the production Turnstile secret in Supabase only.

After saving configuration, redeploy the existing Vercel project and verify a
fresh browser profile can complete Turnstile and establish an anonymous
session. A remote build with a missing site key must remain blocked by the
bootstrap; it must never silently call CAPTCHA-less `signInAnonymously()`.

## Safety checklist

- Local: `127.0.0.1:54321`, CAPTCHA disabled, no Turnstile secret.
- Preview/production: remote Supabase URL, Turnstile site key in Vercel, secret
  stored only in Supabase Bot Protection.
- Never use `NODE_TLS_REJECT_UNAUTHORIZED=0`, insecure HTTPS agents, or
  certificate bypasses.
- Never print, commit, or paste anon keys, Turnstile secrets, access tokens, or
  cookies into application code.

Deferred work remains: durable distributed rate limiting, anonymous-user
retention/cleanup, and permanent account linking.
