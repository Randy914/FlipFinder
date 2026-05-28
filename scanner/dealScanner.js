const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getFallbackDeals() {
  return [
    { id: "deal-1", name: "Anker 737 Power Bank 24,000mAh", source: "Amazon", sourceUrl: "https://www.amazon.com/s?k=Anker+737+Power+Bank", buyPrice: 55.99, sellPrice: 101.99, estimatedProfit: 37.50, roi: 67, dealType: "Clearance", tags: ["Fast seller", "Low competition", "4.8 stars"], bestPlatform: "eBay", soldCount: "127 sold last 7 days", riskLevel: "Low", stockNote: "Limited stock", confidence: 85 },
    { id: "deal-2", name: "LEGO Technic Bugatti Bolide 42151", source: "Walmart", sourceUrl: "https://www.walmart.com/search?q=LEGO+42151", buyPrice: 89.00, sellPrice: 148.00, estimatedProfit: 44.00, roi: 49, dealType: "Clearance", tags: ["Retired set", "Collectible", "Rising demand"], bestPlatform: "eBay", soldCount: "89 sold last 7 days", riskLevel: "Low", stockNote: "2 left", confidence: 80 },
    { id: "deal-3", name: "Ninja Creami Ice Cream Maker NC301", source: "Target", sourceUrl: "https://www.target.com/s?searchTerm=Ninja+Creami", buyPrice: 129.00, sellPrice: 199.99, estimatedProfit: 53.00, roi: 41, dealType: "High Demand", tags: ["Viral product", "Fast seller"], bestPlatform: "eBay", soldCount: "47 sold today", riskLevel: "Low", stockNote: "In stock", confidence: 78 },
    { id: "deal-4", name: "Sony WH-1000XM5 Headphones", source: "Best Buy", sourceUrl: "https://www.bestbuy.com/site/searchpage.jsp?st=WH-1000XM5", buyPrice: 199.00, sellPrice: 329.99, estimatedProfit: 98.00, roi: 65, dealType: "Open Box", tags: ["Premium brand", "High demand"], bestPlatform: "eBay", soldCount: "200+ sold last 7 days", riskLevel: "Low", stockNote: "Open box deal", confidence: 90 },
    { id: "deal-5", name: "Pokemon 151 Ultra Premium Collection", source: "Target", sourceUrl: "https://www.target.com/s?searchTerm=Pokemon+151", buyPrice: 119.99, sellPrice: 219.99, estimatedProfit: 79.00, roi: 66, dealType: "Collectible", tags: ["Collectible", "Scarce", "High demand"], bestPlatform: "eBay", soldCount: "300+ sold last 7 days", riskLevel: "Low", stockNote: "Hard to find", confidence: 92 }
  ];
}

async function scanForDeals() {
  console.log(`[${new Date().toISOString()}] Starting deal scan...`);
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: "Search for the best resell arbitrage deals today on Amazon, Walmart, Target, Best Buy, Slickdeals. Find clearance items and mispriced products. Check eBay sold listings for resell prices. Return ONLY a JSON array starting with [ and ending with ]. No other text. Each item needs: id, name, source, sourceUrl, buyPrice, sellPrice, estimatedProfit, roi, dealType, tags, bestPlatform, soldCount, riskLevel, stockNote, confidence. Only include deals with 40%+ ROI." }],
    });
    const raw = response.content.filter(b => b.type === "text").map(b => b.text).join("");
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      const deals = JSON.parse(match[0]);
      console.log(`[SCANNER] Found ${deals.length} live deals`);
      return deals.length ? deals : getFallbackDeals();
    }
  } catch(e) {
    console.error("[SCANNER] Error:", e.message);
  }
  console.log("[SCANNER] Using fallback deals");
  return getFallbackDeals();
}

async function generateListing(deal) {
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{ role: "user", content: `Create an eBay listing for: ${deal.name} at $${deal.sellPrice}. Return ONLY JSON no markdown: {"title":"","price":${deal.sellPrice},"description":"","condition":"New","shippingNote":"Ships within 1 business day"}` }],
    });
    const text = response.content[0].text;
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch(e) { return null; }
}

module.exports = { scanForDeals, generateListing };
