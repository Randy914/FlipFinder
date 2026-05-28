const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Sources to scan ───────────────────────────────────────────────────────
const SCAN_SOURCES = [
  "Amazon clearance and lightning deals",
  "Walmart clearance rollback deals",
  "Target clearance Circle deals",
  "Best Buy open box and clearance",
  "Home Depot clearance tools appliances",
  "Costco kirkland deals and markdowns",
  "Slickdeals hot deals front page",
  "DealNews top deals today",
  "Newegg shell shocker deals",
  "Nike adidas outlet clearance shoes",
];

// ─── Search for real deals using Claude with web search ───────────────────
async function scanForDeals() {
  console.log(`[${new Date().toISOString()}] Starting deal scan...`);

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const prompt = `Today is ${today}. You are a professional reseller and arbitrage expert.

Search the web RIGHT NOW for the best resell arbitrage opportunities. Find items that are:
1. Mismarked / mispriced (listed far below actual market value)
2. Deep clearance (70%+ off) with strong resell demand
3. High-velocity sellers (lots of recent sales on eBay/Mercari)
4. Low stock + high demand (scarcity plays)
5. Collectibles/limited items (LEGO, sneakers, trading cards, Funko)

Search these sources: ${SCAN_SOURCES.join(", ")}

Also search eBay sold listings to verify actual resell prices.

For each deal found, evaluate:
- Buy price (current sale price)
- Real market/resell price (from eBay sold listings)
- Estimated profit after fees (eBay ~13%, Mercari ~10%)
- Sell velocity (how fast does it sell)
- Competition level (few vs many sellers)
- Risk level (low/medium/high)

Return ONLY a JSON array (no markdown, no explanation) of the top 5 deals in this exact format:
[
  {
    "id": "unique-id-1",
    "name": "Full product name",
    "source": "Amazon",
    "sourceUrl": "https://actual-product-url.com",
    "buyPrice": 55.99,
    "sellPrice": 101.99,
    "estimatedProfit": 37.50,
    "roi": 67,
    "dealType": "Clearance",
    "tags": ["Fast seller", "Low competition", "4.8 stars"],
    "bestPlatform": "eBay",
    "soldCount": "127 sold last 7 days",
    "riskLevel": "Low",
    "stockNote": "3 left in stock",
    "confidence": 85
  }
]

Only include deals with at least 40% ROI and high confidence. Real URLs only.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: prompt }],
  });

  // Extract text content from response
  const textBlocks = response.content.filter((b) => b.type === "text");
  const raw = textBlocks.map((b) => b.text).join("");

  // Parse JSON from response
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error("No JSON array found in response");
    return [];
  }

  const deals = JSON.parse(jsonMatch[0]);
  console.log(`[SCANNER] Found ${deals.length} deals`);
  return deals;
}

// ─── Generate AI listing for a deal ───────────────────────────────────────
async function generateListing(deal) {
  const prompt = `You are an expert eBay/Mercari seller. Create an optimized product listing for:

Product: ${deal.name}
Sell price: $${deal.sellPrice}
Platform: ${deal.bestPlatform}

Return ONLY JSON (no markdown):
{
  "title": "SEO-optimized listing title under 80 chars",
  "price": ${deal.sellPrice},
  "description": "Compelling 3-4 sentence description with key features and fast-ship promise",
  "condition": "New",
  "shippingNote": "Ships within 1 business day"
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
}

module.exports = { scanForDeals, generateListing };
