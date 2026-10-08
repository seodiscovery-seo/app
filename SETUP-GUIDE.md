# Email App: Setup Guide

For someone who is not a programmer. Copy and paste the commands exactly. Steps are for **Windows**.

**What you need:** Node.js (free), VS Code (free). For real delivery later: a domain you own and a free Resend account.

---

## Part 1: Run it on your computer (about 15 minutes)

### 1. Install Node.js
Go to **https://nodejs.org**, download **LTS**, install with the default options, restart the computer.

### 2. Extract the project
Right-click `email-app.zip` → **Extract All** → choose `C:\` → you get **`C:\email-app`** with `package.json` inside.

> Use a **new** folder. Don't extract over your old `transactional-email-app` folder.

### 3. Open it in VS Code
**File → Open Folder → `C:\email-app`**. If a blue "Restricted Mode" bar appears, click **Manage → Trust**.
Open the terminal: **Terminal → New Terminal**. The line should end with `C:\email-app>`.

### 4. Install (one time, 2–10 minutes)
```powershell
npm install
```
Yellow warnings and "vulnerabilities" lines are normal. **Don't** run `npm audit fix --force`.

> If you see "running scripts is disabled": run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`, then `npm install` again.

### 5. Set up the database and admin
```powershell
npm run setup
```
Wait for **✅ Setup complete**.

### 6. Start
```powershell
npm run dev
```
Open **http://localhost:3000** and sign in:

| Email | Password |
|---|---|
| `admin@example.com` | `Admin@12345678` |

Change it later under **Users** → your name → New password.

**Stop:** click in the terminal, press **Ctrl + C**. **Start again:** `npm run dev`.

### 7. Try it (Test mode)
The purple bar says **Test mode**: emails are created and saved, not delivered. That's perfect for checking everything.
1. **Settings:** your brand name, button colour, logo link, support email → **Save settings**
2. **Emails → Password reset:** look at Desktop / Mobile / Plain text. Change `"Priya"` in Sample data and watch the preview change.
3. **Send test email** → **Open in logs** to see the saved copy.

### 8. Make and send a quotation
Sidebar → **Quotations** → **+ New quotation** and fill the 4 steps (client, items, tax & validity, notes). Press **Save & send to client**. The client gets a PDF and a **View & accept** button; you see *Viewed* and *Accepted/Declined* on the quotation. **Copy client link** lets you share it on WhatsApp too.
First set your defaults in **Settings → Quotations** (GST %, GSTIN, terms).

> **Updating from an older version?** Run `npm run setup` once after `npm install`: it adds the new Quotations table and keeps all your data.

### 9. Send a file you already have
Sidebar → **Send a document** → choose **Quotation / Invoice / Proposal / Report** → client email and name → edit the message → drop your PDF (or image, Word, Excel) → check the preview on the right → **Send**.
Use it for documents people expect from you, not for mass or cold emails.

### 10. Accounts and passwords
- **Forgot your password?** On the sign-in page press **Forgot password?**. In Test mode the email isn't delivered, so the reset link is printed in the terminal where `npm run dev` runs: copy it into the browser.
- **Change your password:** sidebar → **My account**.
- **Let your team create their own accounts:** Settings → *Sign-in & accounts* → tick **Let people create their own account**, and put `seodiscovery.com` in **Only allow this email domain**. New people get a confirmation email, then start as Viewers; make them Admin under Users if needed.

---

## Part 2: Real delivery with your domain (one time)

### 8. Resend account and domain
1. Sign up free at **https://resend.com**
2. **Domains → Add domain** → type a sub-domain, e.g. `mail.yourdomain.com` (keeps your main domain's email safe)
3. Resend shows **DNS records** (TXT and MX, for SPF/DKIM). Open your domain panel (GoDaddy, Hostinger, Cloudflare…) → DNS → add each record exactly as shown (Type, Name, Value).
4. Also add this TXT record for DMARC: Name `_dmarc.mail` (or `_dmarc.mail.yourdomain.com`), Value `v=DMARC1; p=none;`
5. Back in Resend press **Verify**. It can take a few minutes to a few hours. Wait until it says **Verified**.

### 9. Connect Resend
1. Resend → **API Keys → Create API key** → Permission: **Sending access** → copy it (starts with `re_`)
2. In VS Code open the file **`.env`** and paste between the quotes:
   ```
   RESEND_API_KEY="re_your_key_here"
   ```
   Save (Ctrl + S).
   When the panel is online, also set `APP_URL="https://emails.yourdomain.com"` so reset links point to the right address.
3. In the app → **Settings → From email**: `no-reply@mail.yourdomain.com` (must use the verified domain) → Save
4. Restart: in the terminal press **Ctrl + C**, then `npm run dev`. The top bar turns **green: Live**.
5. **Emails → any email → Send test email** to your own Gmail. Check the inbox (and spam the first time).

Test in Gmail, Outlook and on your phone before you connect your website.

---

## Part 3: Put it online and connect your website

Your website needs to reach this app over the internet, and Resend's bounce webhook needs a public address too. Good options:

**A small VPS** (Hostinger VPS, DigitalOcean, Contabo; Ubuntu). A developer can run:
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs
cd /var/www/email-app && npm install && npm run setup && npm run build
sudo npm install -g pm2 && pm2 start npm --name email-app -- start && pm2 save && pm2 startup
```
Point a sub-domain such as `emails.yourdomain.com` to the server and add HTTPS (Caddy, or Nginx + Certbot). Copy your `.env` values to the server.

**Railway / Render:** run `npm run setup` on your computer first (it creates `prisma/migrations`), upload the project including that folder, add a disk mounted at `/data`, set `DATABASE_URL="file:/data/email.db"` plus the other `.env` values, build `npm install && npm run build`, start `npx prisma migrate deploy && npx prisma db seed && npm start`.

### 10. Turn on bounce tracking (after it's online)
1. Resend → **Webhooks → Add endpoint** → URL: `https://emails.yourdomain.com/api/webhooks/resend`
2. Events: **sent, delivered, delivery delayed, bounced, complained**
3. Copy the **Signing secret** (`whsec_…`) into `.env`: `RESEND_WEBHOOK_SECRET="whsec_…"` and restart.

Now bounced addresses and spam complaints go to the **Block list** automatically.

### 11. Connect your website
1. App → **API & setup → Create key** (name: "Website"). Copy it now, it's shown once.
2. Give your developer: the app address (`https://emails.yourdomain.com`), the key, and the README (it has Node.js and PHP examples).
3. Each email page in the admin shows the exact code for that email.

**Keep the key secret:** only on your website's server, never in browser JavaScript.

---

## Backup
```powershell
npm run backup
```
Saves a copy of the database in `backups\`. Copy that folder to Google Drive or a USB drive weekly.

## Common problems

| Problem | Fix |
|---|---|
| `'npm' is not recognized` | Install Node.js and restart (step 1) |
| Bar still says Test mode | `RESEND_API_KEY` is empty in `.env`, or the app wasn't restarted, or `EMAIL_MODE="test"` |
| "Set a From email in Settings" | Settings → From email, using your verified domain |
| `Resend 403` / "domain is not verified" | Finish step 8 and wait for Verified |
| Emails land in spam | Check DNS records in Resend are all green, add DMARC, send from a sub-domain, avoid ALL CAPS subjects |
| Webhook shows 401 | The signing secret in `.env` doesn't match Resend's, or the app wasn't restarted |
| Forgot admin password | In `.env` set `ADMIN_PASSWORD="NewPass@123"` and add `ADMIN_RESET_PASSWORD="true"`, run `npx prisma db seed`, then remove that line |

## What needs an outside service
- **Resend** to actually deliver emails (free plan to start). Everything else works without it in Test mode.
- **A domain** for the From address and DNS records.
- **Hosting** for your website to reach the app and for bounce webhooks.
