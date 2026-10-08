/** npm run backup — copies the database to backups/ with the date and time. */
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";

if (!existsSync("prisma/dev.db")) {
  console.error("✖ Database not found at prisma/dev.db. Run `npm run setup` first.");
  process.exit(1);
}
mkdirSync("backups", { recursive: true });
const stamp = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
const target = `backups/email-app-${stamp}.db`;
copyFileSync("prisma/dev.db", target);
console.log(`✔ Backup saved: ${target} (${Math.round(statSync(target).size / 1024)} KB)`);
