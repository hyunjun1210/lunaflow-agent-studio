import assets from 'lunaflow:assets';

const secretKeys = new Map([
  ['helper', 'DIRECT_LINE_HELPER_SECRET'],
  ['director', 'DIRECT_LINE_DIRECTOR_SECRET'],
  ['vfx', 'DIRECT_LINE_VFX_SECRET'],
]);
const tokenPath = '/api/direct-line/';
const directLine = 'https://directline.botframework.com/v3/directline';
const siteOrigin = 'https://lunaflow-agent-studio.sunsetcatkin1.chatgpt.site';

function json(data, status) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function issueToken(request, env, agentId) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (request.headers.get('Origin') !== siteOrigin || !request.headers.get('oai-authenticated-user-id')) {
    return json({ error: 'forbidden' }, 403);
  }

  const key = secretKeys.get(agentId);
  if (!key) return json({ error: 'unknown_agent' }, 404);
  const secret = env[key];
  if (!secret) return json({ error: 'not_configured' }, 503);

  try {
    const response = await fetch(`${directLine}/tokens/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ trustedOrigins: [siteOrigin] }),
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      const { token } = await response.json();
      if (typeof token === 'string' && token) return json({ token, domain: directLine }, 200);
    }
  } catch {
    // Upstream responses and credentials stay on the server.
  }
  return json({ error: 'token_unavailable' }, 502);
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith(tokenPath)) return issueToken(request, env, pathname.slice(tokenPath.length));
    const assetPath = pathname === '/index.html' || pathname === '/auth-redirect.html' ? '/' : pathname;
    if (!Object.hasOwn(assets, assetPath)) return new Response('Not found', { status: 404 });
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
    }
    const [type, content] = assets[assetPath];
    return new Response(request.method === 'HEAD' ? null : content, {
      headers: { 'Content-Type': type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' },
    });
  },
};
