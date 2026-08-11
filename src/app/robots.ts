import type { MetadataRoute } from "next";

const BASE_URL = "https://app.adience.no";
const DISALLOW = ["/min-side", "/admin", "/api/"];

// Explicitly allows real classic-search and AI-answer-engine crawlers
// (Googlebot, Bingbot, OpenAI's OAI-SearchBot, and Anthropic's ClaudeBot /
// Claude-User / legacy anthropic-ai), plus every other agent via the
// wildcard fallback. /min-side, /admin, and /api/ are disallowed for all
// agents — those are login-gated or non-page routes and are also marked
// noindex in their own page metadata as a second line of defense.
export default function robots(): MetadataRoute.Robots {
  const agents = ["Googlebot", "Bingbot", "OAI-SearchBot", "ClaudeBot", "Claude-User", "anthropic-ai"];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...agents.map((userAgent) => ({ userAgent, allow: "/", disallow: DISALLOW })),
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
