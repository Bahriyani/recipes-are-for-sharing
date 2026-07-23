import { spawn, spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const command = (executable, args) =>
  isWindows ? ["cmd.exe", ["/d", "/s", "/c", [executable, ...args].join(" ")]] : [executable, args];
const [statusCommand, statusArgs] = command(isWindows ? "npx.cmd" : "npx", ["supabase", "status", "-o", "env"]);
const status = spawnSync(statusCommand, statusArgs, {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "true" },
});

function parseEnv(output) {
  const apiMatch = output.match(/API_URL"?\s*[:=]\s*"?([^"\s,}]+)/);
  const anonMatch = output.match(/ANON_KEY"?\s*[:=]\s*"?([^"\s,}]+)/);
  if (apiMatch && anonMatch) return { API_URL: apiMatch[1], ANON_KEY: anonMatch[1] };
  try {
    const parsed = JSON.parse(output);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // Older CLI versions emit shell-style KEY=value lines.
  }
  return Object.fromEntries(
    output.split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^(?:export\s+)?([A-Z0-9_]+)=(.*)$/);
      if (!match) return [];
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replace(/\\"/g, '"');
      return [[match[1], value]];
    }),
  );
}

const localEnv = parseEnv(`${status.stdout ?? ""}\n${status.stderr ?? ""}`);
const localUrl = localEnv.API_URL;
const localAnonKey = localEnv.ANON_KEY;
if (localUrl !== "http://127.0.0.1:54321" || !localAnonKey) {
  console.error("Local Supabase is not running. Start it with `supabase start`, then run `npm run dev` again.");
  process.exit(1);
}

const [devCommand, devArgs] = command(isWindows ? "npm.cmd" : "npm", ["run", "dev:next"]);
const child = spawn(devCommand, devArgs, {
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: localUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: localAnonKey,
  },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  process.exit(signal ? 1 : (code ?? 1));
});
