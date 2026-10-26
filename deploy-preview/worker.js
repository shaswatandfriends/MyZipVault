// BTS Platform — static preview Worker
// Serves: static assets (landing + chunks) via assets binding, /api/landing-content
// stub (defaults JSON), branded fallback page for all other routes.
// Full app (auth + DB) deploys later via @opennextjs/cloudflare once the
// production database (Supabase, owner-gated) is attached.

import LANDING_JSON from "./landing.json" with { type: "json" };
import FALLBACK_HTML from "./fallback.html" with { type: "text" };

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Landing page config — matches what the app's API returns (defaults).
    if (url.pathname === "/api/landing-content") {
      return new Response(JSON.stringify(LANDING_JSON), {
        headers: {
          "content-type": "application/json",
          "cache-control": "public, max-age=300",
          ...SECURITY_HEADERS,
        },
      });
    }

    // All non-asset GETs → branded preview page.
    if (request.method === "GET" || request.method === "HEAD") {
      return new Response(FALLBACK_HTML, {
        headers: {
          "content-type": "text/html;charset=UTF-8",
          "cache-control": "public, max-age=300",
          ...SECURITY_HEADERS,
        },
      });
    }

    // Writes (login attempts, form posts) — honest refusal, not a fake success.
    return new Response(
      JSON.stringify({
        error: "This is a static preview deployment. The full application API goes live at launch.",
      }),
      {
        status: 503,
        headers: { "content-type": "application/json", ...SECURITY_HEADERS },
      },
    );
  },
};
