import assets from 'lunaflow:assets';

import { issueDirectLineToken, json } from './direct-line.mjs';

const tokenPath = '/api/direct-line/';
const siteOrigin = 'https://lunaflow-agent-studio.sunsetcatkin1.chatgpt.site';

async function issueToken(request, env, agentId) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (request.headers.get('Origin') !== siteOrigin || !request.headers.get('oai-authenticated-user-id')) {
    return json({ error: 'forbidden' }, 403);
  }

  return issueDirectLineToken(env, agentId, siteOrigin);
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
