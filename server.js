const express = require("express");
const webpush = require("web-push");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const { scanForDeals, generateListing } = require("./scanner/dealScanner");

const app = express();
app.use(express.json());
app.use(express.static("public"));

// ─── VAPID keys for push notifications ────────────────────────────────────
// Generate once with: npx web-push generate-vapid-keys
// Then add to your .env file
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.warn(
    "⚠️  VAPID keys not set. Run: npx web-push generate-vapid-keys"
  );
} else {
  webpush.setVapidDetails(
    "mailto:you@example.com",
    VAPID_PUBLIC,
    VAPID_PRIVATE
  );
}

// ─── Simple file-based storage (swap for DB in production) ────────────────
const DB_FILE = "./data.json";

function readDB() {
  if (!fs.existsSync(DB_FILE)) return { subscriptions: [], deals: [] };
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ─── Push notification helper ─────────────────────────────────────────────
async function sendPushToAll(deal) {
  const db = readDB();
  if (!db.subscriptions.length) {
    console.log("[PUSH] No subscribers yet");
    return;
  }

  const payload = JSON.stringify({
    title: `🔥 Deal Alert — ${deal.roi}% ROI`,
    body: `${deal.name} · Buy $${deal.buyPrice} → Sell $${deal.sellPrice} · Est. profit $${deal.estimatedProfit}`,
    icon: "/icon.png",
    badge: "/badge.png",
    data: { dealId: deal.id, url: "/app" },
  });

  const results = await Promise.allSettled(
    db.subscriptions.map((sub) => webpush.sendNotification(sub, payload))
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;
  console.log(`[PUSH] Sent: ${sent}, Failed: ${failed}`);
}

// ─── Routes ───────────────────────────────────────────────────────────────

// Register push subscription from browser
app.post("/api/subscribe", (req, res) => {
  const subscription = req.body;
  const db = readDB();

  const exists = db.subscriptions.some(
    (s) => s.endpoint === subscription.endpoint
  );
  if (!exists) {
    db.subscriptions.push(subscription);
    writeDB(db);
    console.log("[PUSH] New subscriber registered");
  }

  res.json({ success: true });
});

// Get today's deals
app.get("/api/deals", (req, res) => {
  const db = readDB();
  res.json(db.deals || []);
});

// Get listing for a specific deal
app.get("/api/deals/:id/listing", async (req, res) => {
  const db = readDB();
  const deal = db.deals.find((d) => d.id === req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });

  const listing = await generateListing(deal);
  res.json(listing);
});

// Approve a deal (mark as approved)
app.post("/api/deals/:id/approve", (req, res) => {
  const db = readDB();
  const deal = db.deals.find((d) => d.id === req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });

  deal.approved = true;
  deal.approvedAt = new Date().toISOString();
  writeDB(db);

  res.json({ success: true, deal });
});

// Skip a deal
app.post("/api/deals/:id/skip", (req, res) => {
  const db = readDB();
  const deal = db.deals.find((d) => d.id === req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });

  deal.skipped = true;
  writeDB(db);
  res.json({ success: true });
});

// Manual scan trigger (for testing)
app.post("/api/scan", async (req, res) => {
  console.log("[API] Manual scan triggered");
  res.json({ message: "Scan started — check back in ~30 seconds" });
  runScan();
});

// VAPID public key for client
app.get("/api/vapid-public-key", (req, res) => {
  res.json({ key: VAPID_PUBLIC });
});

// ─── Core scan + notify function ─────────────────────────────────────────
async function runScan() {
  try {
    const deals = await scanForDeals();
    if (!deals.length) return;

    const db = readDB();

    // Keep existing deals + add new ones (avoid duplicates by name)
    const existingNames = new Set(db.deals.map((d) => d.name));
    const newDeals = deals.filter((d) => !existingNames.has(d.name));

    if (!newDeals.length) {
      console.log("[SCAN] No new deals found");
      return;
    }

    // Add timestamp
    newDeals.forEach((d) => {
      d.foundAt = new Date().toISOString();
      d.approved = false;
      d.skipped = false;
    });

    // Keep last 50 deals in DB
    db.deals = [...newDeals, ...db.deals].slice(0, 50);
    writeDB(db);

    // Push notification for each new deal
    for (const deal of newDeals) {
      await sendPushToAll(deal);
    }

    console.log(`[SCAN] Complete — ${newDeals.length} new deals saved & sent`);
  } catch (err) {
    console.error("[SCAN] Error:", err.message);
  }
}

// ─── Scheduled scans ─────────────────────────────────────────────────────
// Every 2 hours: 0 */2 * * *
// Every hour: 0 * * * *
// Every 30 min (aggressive): */30 * * * *
cron.schedule("0 */2 * * *", () => {
  console.log("[CRON] Running scheduled scan");
  runScan();
});

// ─── Start server ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════╗
║   FlipFinder AI — Server ready   ║
║   http://localhost:${PORT}           ║
╚══════════════════════════════════╝
  `);
  // Run a scan on startup
  setTimeout(runScan, 3000);
});
