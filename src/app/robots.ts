import type { MetadataRoute } from "next";

const BASE_URL = "https://my-zip-vault.vercel.app";

/**
 * Dynamic robots.txt
 *
 * Allows all major bots to crawl the public pages.
 * Disallows /api/, /dashboard/, /recruiter/, /employer/, /superadmin/ (auth-protected).
 * Points to the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Google — allow public pages, block auth-protected
      {
        userAgent: "Googlebot",
        allow: ["/", "/blog", "/browse-jobs", "/for-candidates", "/for-recruiters", "/for-employers", "/faq", "/marketplace-flow", "/credit-system", "/referral-program", "/our-story", "/support", "/contact", "/privacy", "/terms", "/login", "/signup", "/employer-signup", "/agency-signup"],
        disallow: ["/api/", "/dashboard", "/recruiter", "/employer", "/superadmin", "/admin", "/checklists", "/calendar", "/vault", "/references", "/sharing", "/settings", "/profile-completion", "/notifications", "/vaultsign"],
      },
      // Bing
      {
        userAgent: "Bingbot",
        allow: ["/", "/blog", "/browse-jobs"],
        disallow: ["/api/", "/dashboard", "/recruiter", "/employer", "/superadmin", "/admin"],
      },
      // Social crawlers — allow full access for link previews
      {
        userAgent: ["Twitterbot", "facebookexternalhit", "LinkedInBot", "Slackbot", "Discordbot", "Applebot"],
        allow: "/",
      },
      // Default — block auth, allow public
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/recruiter", "/employer", "/superadmin", "/admin", "/checklists", "/calendar", "/vault", "/references", "/sharing", "/settings", "/profile-completion", "/notifications", "/vaultsign"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
