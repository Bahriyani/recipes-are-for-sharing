import { spawnSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type LocalConfig = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

let cachedConfig: LocalConfig | undefined;
let localPrivilegesPrepared = false;

function parseStatusEnv(output: string): Record<string, string> {
  return Object.fromEntries(
    output.split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^(?:export\s+)?([A-Z0-9_]+)=(.*)$/);
      if (!match) return [];
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1).replace(/\\"/g, '"');
      }
      return [[match[1], value]];
    }),
  );
}

function readStatusEnv(): Record<string, string> {
  const result = spawnSync("npx.cmd", ["supabase", "status", "-o", "env"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SUPABASE_TELEMETRY_DISABLED: "1",
      SUPABASE_DISABLE_TELEMETRY: "1",
    },
    encoding: "utf8",
    shell: true,
    stdio: ["ignore", "pipe", "ignore"],
  });
  return parseStatusEnv(`${result.stdout ?? ""}\n${result.stderr ?? ""}`);
}

export function getLocalSupabaseConfig(): LocalConfig {
  if (cachedConfig) return cachedConfig;

  const status = readStatusEnv();
  const url = status.API_URL ?? process.env.SUPABASE_URL ?? "";
  const anonKey = status.ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
  const serviceRoleKey =
    status.SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !anonKey || !serviceRoleKey || !url.startsWith("http://127.0.0.1:")) {
    throw new Error(
      "Local Supabase status is unavailable. Start the disposable local stack and expose its local keys through `supabase status -o env` or test-only environment variables.",
    );
  }

  cachedConfig = { url, anonKey, serviceRoleKey };
  return cachedConfig;
}

export function createLocalClients(): {
  anon: SupabaseClient;
  admin: SupabaseClient;
} {
  const config = getLocalSupabaseConfig();
  prepareLocalPrivileges();
  return {
    anon: createClient(config.url, config.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
    admin: createClient(config.url, config.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  };
}

function prepareLocalPrivileges(): void {
  if (localPrivilegesPrepared) return;
  const statements = [
    "grant usage on schema public to anon, authenticated, service_role",
    "grant select, insert, update, delete on table public.recipe_memories to anon, authenticated, service_role",
  ];
  for (const sql of statements) {
    const result = spawnSync("npx.cmd", ["supabase", "db", "query", "--local", sql], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        SUPABASE_TELEMETRY_DISABLED: "1",
        SUPABASE_DISABLE_TELEMETRY: "1",
      },
      encoding: "utf8",
      shell: true,
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (result.error) {
      throw new Error("Unable to prepare privileges in the disposable local database");
    }
  }
  localPrivilegesPrepared = true;
}

export async function createTestUser(
  admin: SupabaseClient,
  runId: string,
  label: string,
): Promise<{ id: string; email: string; password: string }> {
  const email = `${label}.${runId}@example.test`;
  const password = `RfsTest-${runId}-Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error("Unable to create a local test user");
  return { id: data.user.id, email, password };
}

export async function signInTestUser(
  url: string,
  anonKey: string,
  user: { email: string; password: string },
): Promise<SupabaseClient> {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword(user);
  if (error) throw new Error("Unable to sign in a local test user");
  return client;
}

export function localConfigForAuth(): { url: string; anonKey: string } {
  const config = getLocalSupabaseConfig();
  return { url: config.url, anonKey: config.anonKey };
}
