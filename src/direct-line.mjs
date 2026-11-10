const secretKeys = new Map([
  ['helper', 'DIRECT_LINE_HELPER_SECRET'],
  ['director', 'DIRECT_LINE_DIRECTOR_SECRET'],
  ['vfx', 'DIRECT_LINE_VFX_SECRET'],
]);
const directLine = 'https://directline.botframework.com/v3/directline';

export function json(data, status) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function issueDirectLineToken(env, agentId, origin) {
  const key = secretKeys.get(agentId);
  if (!key) return json({ error: 'unknown_agent' }, 404);
  const secret = env[key];
  if (!secret) return json({ error: 'not_configured' }, 503);

  try {
    const response = await fetch(`${directLine}/tokens/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ trustedOrigins: [origin] }),
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
