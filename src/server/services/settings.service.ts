import "server-only";
import { settingDefaults, settingsSchemas, SETTING_KEYS, type SettingKey, type SettingsMap, type SettingValue } from "@/config/settings";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

function parseStored<K extends SettingKey>(key: K, raw: string | undefined): SettingValue<K> {
  if (raw === undefined) return settingDefaults[key];
  try {
    const result = settingsSchemas[key].safeParse(JSON.parse(raw));
    if (result.success) return result.data as SettingValue<K>;
    logger.warn("Invalid stored setting, using default", { key });
  } catch {
    logger.warn("Unparseable stored setting, using default", { key });
  }
  return settingDefaults[key];
}

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const row = await db.setting.findUnique({ where: { key } });
  return parseStored(key, row?.value);
}

export async function getAllSettings(): Promise<SettingsMap> {
  const rows = await db.setting.findMany({ where: { key: { in: SETTING_KEYS } } });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const out = { ...settingDefaults } as Record<SettingKey, unknown>;
  for (const key of SETTING_KEYS) out[key] = parseStored(key, byKey.get(key));
  return out as SettingsMap;
}

/** Validates the value against the registry schema (throws ZodError if invalid), then upserts. */
export async function setSetting<K extends SettingKey>(key: K, value: unknown): Promise<SettingValue<K>> {
  const parsed = settingsSchemas[key].parse(value) as SettingValue<K>;
  await db.setting.upsert({
    where: { key },
    update: { value: JSON.stringify(parsed) },
    create: { key, value: JSON.stringify(parsed) },
  });
  return parsed;
}
