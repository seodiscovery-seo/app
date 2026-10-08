/**
 * Creates the admin user and default settings. Safe to run many times.
 * ADMIN_RESET_PASSWORD="true" overwrites the admin password.
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { SETTING_KEYS, settingDefaults } from "../src/config/settings";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Admin";
  if (!email || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
  if (password.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters.");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && process.env.ADMIN_RESET_PASSWORD !== "true") {
    console.log(`✔ Admin already exists: ${email}`);
  } else {
    const passwordHash = await hash(password, 12);
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash, isActive: true, role: "ADMIN" },
      create: { email, name, passwordHash, role: "ADMIN" },
    });
    console.log(`✔ Admin ${existing ? "password reset" : "created"}: ${email}`);
  }

  for (const key of SETTING_KEYS) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value: JSON.stringify(settingDefaults[key]) } });
  }
  console.log(`✔ Settings ready (${SETTING_KEYS.length})`);
}

main()
  .catch((err: unknown) => {
    console.error("✖ Seed failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
