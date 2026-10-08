/**
 * npm run test:api
 * Tests the whole backend against the running app (start it first with `npm run dev`).
 * Creates a temporary API key, runs every check, then revokes the key.
 */
import { createHash, createHmac, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import prismaPkg from "@prisma/client";

const { PrismaClient } = prismaPkg;
const BASE = process.env.TEST_URL || "http://localhost:3000";

// ─── read .env (no extra package) ────────────────────────────
const env = {};
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m) env[m[1]] = m[2];
  }
}
for (const [k, v] of Object.entries(env)) if (!process.env[k]) process.env[k] = v;

const db = new PrismaClient();
let passed = 0;
let failed = 0;
const run = Date.now().toString(36);
const addr = (n) => `${n}-${run}@test.example`;

function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failed++;
    console.log(`  ✖ ${name}${detail ? `\n      → ${detail}` : ""}`);
  }
}

async function send(key, body) {
  const res = await fetch(`${BASE}/api/v1/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function webhook(event, secret) {
  const body = JSON.stringify(event);
  const id = `msg_${randomBytes(6).toString("hex")}`;
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", Buffer.from(secret.replace(/^whsec_/, ""), "base64")).update(`${id}.${ts}.${body}`).digest("base64");
  const res = await fetch(`${BASE}/api/webhooks/resend`, {
    method: "POST",
    headers: { "svix-id": id, "svix-timestamp": ts, "svix-signature": `v1,${sig}`, "Content-Type": "application/json" },
    body,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

const link = "https://www.example.com/account";
const show = (r) => `got HTTP ${r.status}: ${JSON.stringify(r.body).slice(0, 160)}`;

async function main() {
  console.log(`\nTesting ${BASE}\n`);

  // 0. Is the app running?
  try {
    const h = await fetch(`${BASE}/api/health`);
    const j = await h.json();
    check("App is running and the database works", h.ok && j.db === "up", JSON.stringify(j));
  } catch {
    console.log("  ✖ The app is not running.\n\n  Open another terminal, run:  npm run dev\n  wait for ✓ Ready, then run:  npm run test:api again.\n");
    process.exit(1);
  }

  // temporary API key
  const key = `ek_${randomBytes(24).toString("base64url")}`;
  const keyRow = await db.apiKey.create({ data: { name: `Automatic test ${run}`, prefix: key.slice(0, 10), hash: createHash("sha256").update(key).digest("hex") } });

  // keep the user's settings safe: remember and clear things that would block the test
  const pausedBefore = await db.templateSetting.findMany({ where: { enabled: false } });
  const hostsBefore = await db.setting.findUnique({ where: { key: "sending.allowedLinkHosts" } });
  if (pausedBefore.length) await db.templateSetting.updateMany({ where: { enabled: false }, data: { enabled: true } });
  if (hostsBefore) await db.setting.update({ where: { key: "sending.allowedLinkHosts" }, data: { value: "[]" } });

  try {
    console.log("\n Sending each email");
    const samples = {
      welcome: { name: "Rahul", actionUrl: link },
      "verify-email": { name: "Rahul", verifyUrl: `${link}/verify?token=abc123`, code: "482913" },
      "password-reset": { name: "Rahul", resetUrl: `${link}/reset?token=SECRET999`, expiresInMinutes: 30, ipAddress: "103.21.58.14" },
      "password-changed": { name: "Rahul", changedAt: "6 Oct 2026, 5:40 PM IST", device: "Chrome on Windows", secureAccountUrl: `${link}/security` },
      "new-login": { name: "Rahul", loginAt: "6 Oct 2026, 5:41 PM IST", device: "Safari on iPhone", location: "Amritsar, India", secureAccountUrl: `${link}/security` },
    };
    let resetLogId = null;
    for (const [template, data] of Object.entries(samples)) {
      const r = await send(key, { template, to: addr(template), data });
      check(`${template.padEnd(17)} sent`, r.status === 200 && r.body.ok, show(r));
      if (template === "password-reset") resetLogId = r.body.id;
    }
    if (resetLogId) {
      const log = await db.emailLog.findUnique({ where: { id: resetLogId } });
      check("Reset token is hidden in the logs", !!log && !log.dataMasked.includes("SECRET999") && log.dataMasked.includes("•••"), log?.dataMasked);
    }

    console.log("\n Safety checks");
    const idem = { template: "welcome", to: addr("idem"), data: samples.welcome, idempotencyKey: `signup-${run}` };
    const a = await send(key, idem);
    const b = await send(key, idem);
    check("Same idempotency key is sent only once", a.body.ok && b.body.duplicate === true && a.body.id === b.body.id, `${show(a)} / ${show(b)}`);

    const missing = await send(key, { template: "password-reset", to: addr("missing"), data: { name: "A" } });
    check("Missing data → 400 with the field name", missing.status === 400 && JSON.stringify(missing.body).includes("resetUrl"), show(missing));

    const evil = await send(key, { template: "welcome", to: addr("evil"), data: { name: "A", actionUrl: "javascript:alert(1)" } });
    check("Dangerous link → 400", evil.status === 400, show(evil));

    const badTo = await send(key, { template: "welcome", to: "not-an-email", data: samples.welcome });
    check("Wrong email address → 400", badTo.status === 400, show(badTo));

    const unknown = await send(key, { template: "invoice", to: addr("x"), data: {} });
    check("Unknown email type → 400", unknown.status === 400, show(unknown));

    const badKey = await send("ek_wrong_key", { template: "welcome", to: addr("x"), data: samples.welcome });
    check("Wrong API key → 401", badKey.status === 401, show(badKey));

    const notJson = await send(key, "this is not json");
    check("Broken request → 400", notJson.status === 400, show(notJson));

    await db.templateSetting.upsert({ where: { templateKey: "welcome" }, update: { enabled: false }, create: { templateKey: "welcome", enabled: false } });
    const paused = await send(key, { template: "welcome", to: addr("paused"), data: samples.welcome });
    await db.templateSetting.update({ where: { templateKey: "welcome" }, data: { enabled: true } });
    check("Paused email → 409", paused.status === 409, show(paused));

    const blocked = addr("blocked");
    await db.suppression.create({ data: { email: blocked, reason: "MANUAL", detail: "automatic test" } });
    const blk = await send(key, { template: "welcome", to: blocked, data: samples.welcome });
    check("Blocked address → 422, nothing sent", blk.status === 422, show(blk));

    console.log("\n Bounce tracking (webhook)");
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    const fake = await fetch(`${BASE}/api/webhooks/resend`, { method: "POST", headers: { "svix-id": "x", "svix-timestamp": "1", "svix-signature": "v1,fake" }, body: "{}" });
    if (!secret) {
      check("Fake webhook refused", fake.status === 503 || fake.status === 401, `HTTP ${fake.status}`);
      console.log("    (Skipped the other webhook tests: RESEND_WEBHOOK_SECRET is empty in .env)");
    } else {
      check("Fake webhook (wrong signature) refused → 401", fake.status === 401, `HTTP ${fake.status}. If 503: restart npm run dev after editing .env`);

      const d = await send(key, { template: "welcome", to: addr("delivered"), data: samples.welcome });
      const wd = await webhook({ type: "email.delivered", data: { email_id: d.body.providerId, to: [addr("delivered")] } }, secret);
      const dl = await db.emailLog.findUnique({ where: { id: d.body.id } });
      check("Delivered event → status Delivered", wd.status === 200 && dl?.status === "DELIVERED", `${show(wd)} status=${dl?.status}`);

      const bAddr = addr("bounce");
      const bs = await send(key, { template: "welcome", to: bAddr, data: samples.welcome });
      const wb = await webhook({ type: "email.bounced", data: { email_id: bs.body.providerId, to: [bAddr], bounce: { type: "Permanent", message: "Mailbox does not exist" } } }, secret);
      const again = await send(key, { template: "welcome", to: bAddr, data: samples.welcome });
      check("Hard bounce → address blocked → next email refused (422)", wb.status === 200 && again.status === 422, `${show(wb)} / ${show(again)}`);

      const sAddr = addr("spam");
      const ss = await send(key, { template: "welcome", to: sAddr, data: samples.welcome });
      await webhook({ type: "email.complained", data: { email_id: ss.body.providerId, to: [sAddr] } }, secret);
      const sup = await db.suppression.findUnique({ where: { email: sAddr } });
      check("Spam complaint → address blocked", sup?.reason === "COMPLAINT", `reason=${sup?.reason}`);

      const tAddr = addr("full");
      const ts = await send(key, { template: "welcome", to: tAddr, data: samples.welcome });
      await webhook({ type: "email.bounced", data: { email_id: ts.body.providerId, to: [tAddr], bounce: { type: "Transient", subType: "MailboxFull" } } }, secret);
      check("Temporary bounce (mailbox full) → NOT blocked", !(await db.suppression.findUnique({ where: { email: tAddr } })));
    }
  } finally {
    // put the user's settings back and remove the temporary key
    await db.apiKey.update({ where: { id: keyRow.id }, data: { revokedAt: new Date() } });
    for (const p of pausedBefore) await db.templateSetting.update({ where: { id: p.id }, data: { enabled: false } });
    if (hostsBefore) await db.setting.update({ where: { key: "sending.allowedLinkHosts" }, data: { value: hostsBefore.value } });
    await db.$disconnect();
  }

  console.log(`\n ${failed === 0 ? "✅ ALL" : "⚠"} ${passed} passed, ${failed} failed`);
  console.log(" Test emails use addresses ending in @test.example. You can see them in Logs and the Block list.\n");
  process.exit(failed ? 1 : 0);
}

main().catch(async (err) => {
  console.error("\n ✖ The test itself crashed:", err?.message ?? err);
  await db.$disconnect().catch(() => {});
  process.exit(1);
});
