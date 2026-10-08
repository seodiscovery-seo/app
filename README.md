# Email App

Transactional email for your website or app: 5 ready emails, one send API, an admin panel with previews, test sends, logs and automatic bounce blocking. Built with Next.js, React Email, Prisma (SQLite), Zod and Resend.

> Not a programmer? Follow **[SETUP-GUIDE.md](./SETUP-GUIDE.md)**.

## Quick start

```bash
npm install
npm run setup     # creates .env, the database and the admin user
npm run dev       # http://localhost:3000  ·  admin@example.com / Admin@12345678
```

It starts in **Test mode**: emails are built and saved so you can open them, but nothing is delivered. Add `RESEND_API_KEY` to `.env` to go live.

## The emails

| Key | Sent when | Data |
|---|---|---|
| `welcome` | account created | `name`, `actionUrl` |
| `verify-email` | confirm address | `name`, `verifyUrl`, `code`?, `expiresInMinutes`? (60) |
| `password-reset` | forgot password | `name`, `resetUrl`, `expiresInMinutes`? (30), `ipAddress`? |
| `password-changed` | password changed | `name`, `changedAt`, `device`?, `ipAddress`?, `secureAccountUrl` |
| `new-login` | sign-in from new device | `name`, `loginAt`, `device`, `location`?, `ipAddress`?, `secureAccountUrl` |
| `document` | quotation, invoice, proposal, report **with files** | `name`, `title`, `message`?, `actionUrl`?, `buttonText`? + `attachments` |

`?` = optional. Links must be `https://` (http allowed for localhost).

## Sending from your app

```http
POST /api/v1/send
Authorization: Bearer ek_…           (create under "API & setup")
Idempotency-Key: reset-user123-1     (optional: same key = sent once)
Content-Type: application/json

{ "template": "password-reset", "to": "user@example.com",
  "data": { "name": "Priya", "resetUrl": "https://app.example.com/reset?token=…" } }
```

**Node.js / Next.js**
```js
const res = await fetch(`${process.env.EMAIL_APP_URL}/api/v1/send`, {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.EMAIL_APP_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ template: "welcome", to: user.email, data: { name: user.name, actionUrl: "https://app.example.com" } }),
});
const result = await res.json(); // { ok: true, id, status } or { ok: false, error, issues? }
```

**PHP (WordPress, Laravel, plain PHP)**
```php
$ch = curl_init(getenv('EMAIL_APP_URL') . '/api/v1/send');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . getenv('EMAIL_APP_KEY'), 'Content-Type: application/json'],
  CURLOPT_POSTFIELDS => json_encode([
    'template' => 'welcome',
    'to' => $user_email,
    'data' => ['name' => $user_name, 'actionUrl' => 'https://yoursite.com/account'],
  ]),
]);
$result = json_decode(curl_exec($ch), true);
```

**With files (document email only):**
```json
{ "template": "document", "to": "client@company.com",
  "data": { "name": "Priya", "title": "Quotation for SEO services" },
  "attachments": [{ "filename": "quotation.pdf", "content": "<base64 of the file>" }] }
```
Allowed: PDF, JPG, PNG, WEBP, DOCX, XLSX, PPTX, CSV, TXT. Up to 5 files, 10 MB each, 25 MB total. The real file type is checked (a renamed `.exe` is refused). File contents are never stored; logs keep names and sizes.

Responses: `200` sent · `400` bad data (`issues` lists fields) · `401` bad key · `409` email paused · `422` address blocked · `429` too many requests · `502` provider failed after 3 tries.

## How sending works (`src/server/email/send.ts`)

1. Checks the address, the template and whether it's paused
2. Idempotency: a repeated key returns the first result
3. Validates data with zod and checks links against the allowed domains
4. Renders HTML + plain text with React Email
5. Skips addresses on the block list
6. Sends through the provider: up to 3 attempts for timeouts, 429 and 5xx; no retry for permanent errors
7. Saves a log with links and codes masked. Full HTML is stored only in test mode.

It never throws, so a failed email can't break your sign-up or login.

## Bounces and spam complaints

`POST /api/webhooks/resend` verifies the Svix signature (`RESEND_WEBHOOK_SECRET`), updates the log status (sent, delivered, delayed, bounced, complained), and adds hard bounces and complaints to the block list. Temporary bounces (mailbox full) are not blocked.

## Admin panel

- **Overview:** 7-day numbers, daily chart, warning when more than 5% fail, go-live checklist
- **Emails:** live preview (desktop, mobile, plain text) with editable sample data, test send, pause/resume
- **Content editor:** change each email's subject, heading, main text, button text, small note and inbox preview line from the panel, with `{{variables}}`, a live preview while typing, length limits and "Reset to default". Wording is stored in the settings table (no database change). Layout and security parts (links, codes, info boxes) stay in code so they can't be broken by accident.
- **Quotations:** create a quote (client, items × quantity × price, discount, GST, validity, notes, terms) with live totals and automatic numbers (QT-2026-001). The app builds a branded A4 PDF, emails it with a "View & accept" button, and the client accepts or declines on a mobile-friendly page (no login). Status: Draft → Sent → Viewed → Accepted / Declined / Expired. Duplicate for new versions; answered quotes are locked. Defaults (prefix, currency, tax, validity, terms, GSTIN) in Settings.
- **Send a document:** pick Quotation / Invoice / Proposal / Report, enter the client, write a message (`{name}` fills in), drop files, see the live email, send. Optional button (payment or proposal link).
- **Logs:** filters, per-email timeline with webhook events, masked data, saved copy in test mode
- **Block list:** automatic entries plus add and remove by hand
- **API & setup:** keys (stored hashed, shown once, revocable), API guide, go-live steps
- **Settings:** brand name, logo, colour, footer, From/Reply-To, allowed link domains, log retention
- **Users:** Admin (everything) and Viewer (read-only)
- **Accounts & sign-in:** sign up (optional, can be limited to one email domain) → confirm email → sign in; forgot password → one-time reset link (30 min); change password under My account; new-device sign-in alerts. Changing a password signs out every other session. These emails go through the app's own templates.

### Sign-in security notes
- Passwords: bcrypt (12 rounds); sign-in limited to 5 tries per 15 min; forgot/reset/sign-up are rate-limited too.
- Reset and verify tokens: 32 random bytes, stored only as SHA-256 hashes, single use, short expiry.
- Answers never reveal whether an email has an account.
- The verify link needs a button press, so email scanners that open links can't activate accounts.
- `APP_URL` in `.env` builds the links in these emails. Set it to the panel's public address when online.
- In test mode the reset/verify links are also printed in the terminal running `npm run dev`.

## Project structure

```
src/emails/components.tsx     shared design: layout, button, info box, security notice, footer
src/emails/templates/*.tsx    the 5 emails
src/emails/registry.tsx       data rules, sample data, subjects (add new emails here)
src/server/email/             render, send, providers, masking, webhook
src/app/api/v1/send           public send API
src/app/api/webhooks/resend   bounce/complaint webhook
src/app/(admin)/              admin pages
prisma/schema.prisma          database tables
```

**Add an email:** create `src/emails/templates/my-email.tsx` using the shared components, then add an entry to `TEMPLATES` in `registry.tsx` (schema, sample, subject, preheader, linkFields). It appears in the admin panel automatically.

**Use another provider (SMTP, Amazon SES):** add it in `src/server/email/providers.ts` and return it from `getProvider()`. Nothing else changes.

## Commands

| | |
|---|---|
| `npm run setup` | first-time setup (safe to repeat) |
| `npm run dev` | run on your computer |
| `npm run build` then `npm start` | production |
| `npm run backup` | copy the database to `backups/` |
| `npm run check` | TypeScript + lint |
