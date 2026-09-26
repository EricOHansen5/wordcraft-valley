/* Wordcraft Valley on Cloudflare: the friends-and-family copy.
   Every file in app/ is served straight from static assets and never reaches
   this script. It only runs when nothing matches:
     "/"       -> index.html (html_handling is "none" so /index.html isn't
                  redirected; see wrangler.toml)
     anything  -> 404. No /api/* here, so the game's backup quietly stays off,
                  and a missing voice clip is a real 404 the service worker
                  won't cache. */
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/") {
      const res = await env.ASSETS.fetch(new Request(new URL("/index.html", url), req));
      const out = new Response(res.body, res);
      out.headers.set("Cache-Control", "no-cache");
      return out;
    }
    return new Response("not found", {status: 404, headers: {"Content-Type": "text/plain"}});
  }
};
