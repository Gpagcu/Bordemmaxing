// Cloudflare Worker for Bordemmaxing.
//
// Serves the built React client (static assets) and forwards /api/* and
// /healthz to the Render API with a shared secret header. Cloudflare Access
// sits in front of this whole Worker, so nothing here is reachable without
// passing the email login first.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/') || url.pathname === '/healthz') {
      const target = new URL(url.pathname + url.search, env.API_ORIGIN);

      const headers = new Headers(request.headers);
      headers.set('X-Proxy-Secret', env.PROXY_SECRET);
      // The browser's Cloudflare Access cookie is for Cloudflare, not for Render.
      headers.delete('cookie');

      const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
      return fetch(target, {
        method: request.method,
        headers,
        body: hasBody ? request.body : undefined,
        redirect: 'manual',
      });
    }

    // Everything else is the static client. Unknown paths fall back to
    // index.html (configured in wrangler.jsonc).
    return env.ASSETS.fetch(request);
  },
};