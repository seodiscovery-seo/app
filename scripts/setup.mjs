/**
 * One-command setup for the Email App.
 *   npm run setup
 * 1. Creates .env (with a random AUTH_SECRET) if it does not exist
 * 2. Creates/updates the SQLite database
 * 3. Creates the admin user and default settings
 * Safe to run again at any time.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";

const step = (msg) => console.log(`\n▶ ${msg}`);
const run = (cmd) => execSync(cmd, { stdio: "inherit", shell: true });

step("Checking .env file");
if (!existsSync(".env")) {
  const template = readFileSync(".env.example", "utf8");
  const secret = randomBytes(32).toString("base64");
  writeFileSync(".env", template.replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET="${secret}"`));
  console.log("  ✔ Created .env with a new random AUTH_SECRET");
} else {
  const env = readFileSync(".env", "utf8");
  if (/^AUTH_SECRET=""\s*$/m.test(env)) {
    const secret = randomBytes(32).toString("base64");
    writeFileSync(".env", env.replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET="${secret}"`));
    console.log("  ✔ Filled empty AUTH_SECRET in .env");
  } else {
    console.log("  ✔ .env already exists (kept as is)");
  }
}

const hasMigrations =
  existsSync("prisma/migrations") &&
  readdirSync("prisma/migrations").some((name) => name !== "migration_lock.toml");

if (!hasMigrations) {
  step("Creating database (first time)");
  run("npx prisma migrate dev --name init"); // also runs the seed
} else {
  step("Updating database (adds any new tables, keeps your data)");
  // migrate dev creates a small migration only when the schema changed (e.g. a new feature added a table)
  run("npx prisma migrate dev --name update --skip-seed");
  step("Adding admin user and settings");
  run("npx prisma db seed");
}

console.log("\n✅ Setup complete. Start the app with:  npm run dev");
console.log("   Then open:  http://localhost:3000\n");
