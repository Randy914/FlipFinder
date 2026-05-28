# FlipFinder AI — Setup Guide

## What this is
A Node.js server that:
- Scans 14+ deal sources every 2 hours using Claude AI + web search
- Scores deals by ROI, demand, and risk
- Sends push notifications to your phone the instant a deal is found
- Generates AI-written eBay/Mercari listings on demand

---

## Step 1 — Get your Anthropic API key (5 min)
1. Go to https://console.anthropic.com
2. Sign up / log in
3. Click "API Keys" → "Create Key"
4. Copy the key

---

## Step 2 — Set up the project locally

```bash
# Clone or copy the flipfinder folder, then:
cd flipfinder
npm install

# Generate VAPID keys for push notifications
npm run generate-vapid
# Copy the two keys it prints out
```

---

## Step 3 — Create your .env file

```bash
cp .env.example .env
```

Open `.env` and fill in:
- `ANTHROPIC_API_KEY` — from Step 1
- `VAPID_PUBLIC_KEY` — from Step 2 output
- `VAPID_PRIVATE_KEY` — from Step 2 output

---

## Step 4 — Run it locally (test first)

```bash
npm start
```

Open http://localhost:3000 in your browser.
Tap "Enable deal alerts" to register for push notifications.
Tap "Scan for deals now" in Settings to trigger a manual scan.

---

## Step 5 — Deploy to Railway (free, always-on)

1. Go to https://railway.app — sign up free
2. Click "New Project" → "Deploy from GitHub"
   - Push your flipfinder folder to a GitHub repo first, OR
   - Use "Empty Project" → drag and drop the folder
3. In Railway dashboard → "Variables" tab, add:
   - ANTHROPIC_API_KEY
   - VAPID_PUBLIC_KEY  
   - VAPID_PRIVATE_KEY
4. Deploy — Railway gives you a public URL like `https://flipfinder-abc123.railway.app`

---

## Step 6 — Add to your phone home screen

### iPhone (Safari):
1. Open your Railway URL in Safari
2. Tap the Share button (box with arrow)
3. Tap "Add to Home Screen"
4. Tap "Add"
5. Open the app from your home screen
6. Tap "Enable deal alerts" → Allow

### Android (Chrome):
1. Open your Railway URL in Chrome
2. Chrome shows "Add to Home Screen" banner automatically
3. Or tap ⋮ menu → "Add to Home Screen"

The app now works like a native app — push notifications, home screen icon, full screen.

---

## How it works

Every 2 hours, the scanner:
1. Uses Claude AI with web search to scan all sources
2. Checks eBay sold listings to verify real resell prices
3. Calculates ROI, profit, risk, and sell velocity
4. Saves top 5 deals to the database
5. Sends push notifications to all registered devices

When you tap a notification:
- Opens the deal card in the app
- Shows buy price, sell price, profit estimate
- One tap to view the purchase link
- AI generates a listing draft when you tap "Listing"

---

## Scan frequency

Edit `server.js` line with `cron.schedule` to change frequency:
- Every 2 hours: `"0 */2 * * *"` (default)
- Every hour: `"0 * * * *"`
- Every 30 min: `"*/30 * * * *"`

---

## Running cost estimate

| Service | Cost |
|---------|------|
| Anthropic API (5 scans/day) | ~$3-6/month |
| Railway server | Free tier (enough) |
| Push notifications | Free (built-in) |
| **Total** | **~$3-6/month** |
