/** Minimal structured logger. Swap the sink later (e.g. Pino, Sentry) without touching callers. */
type Level = "debug" | "info" | "warn" | "error";
type Meta = Record<string, unknown>;

function serializeError(err: unknown): unknown {
  if (err instanceof Error) return { name: err.name, message: err.message, stack: err.stack };
  return err;
}

function write(level: Level, message: string, meta?: Meta) {
  if (level === "debug" && process.env.NODE_ENV === "production") return;
  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...(meta ? Object.fromEntries(Object.entries(meta).map(([k, v]) => [k, k === "error" ? serializeError(v) : v])) : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, meta?: Meta) => write("debug", msg, meta),
  info: (msg: string, meta?: Meta) => write("info", msg, meta),
  warn: (msg: string, meta?: Meta) => write("warn", msg, meta),
  error: (msg: string, meta?: Meta) => write("error", msg, meta),
};
