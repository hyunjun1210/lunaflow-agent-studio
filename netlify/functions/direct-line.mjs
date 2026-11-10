import { issueDirectLineToken, json } from '../../src/direct-line.mjs';

export const config = {
  path: '/api/direct-line/:agent',
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};

export default function directLine(request, context) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const origin = new URL(request.url).origin;
  if (request.headers.get('Origin') !== origin) return json({ error: 'forbidden' }, 403);

  return issueDirectLineToken(process.env, context.params.agent, origin);
}
