import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

const chat = await build({
  entryPoints: ['src/chat-runtime.jsx'],
  bundle: true,
  format: 'esm',
  jsx: 'automatic',
  minify: true,
  write: false,
  legalComments: 'inline',
});

const fingerprint = (content) => createHash('sha256').update(content).digest('hex').slice(0, 12);
const chatScript = chat.outputFiles[0].text;
const appScript = (await readFile('dist/app.js', 'utf8')).replace('__CHAT_VERSION__', fingerprint(chatScript));
const page = (await readFile('dist/index.html', 'utf8')).replace('src="app.js"', `src="app.js?v=${fingerprint(appScript)}"`);

const assets = {
  '/': ['text/html; charset=utf-8', page],
  '/style.css': ['text/css; charset=utf-8', await readFile('dist/style.css', 'utf8')],
  '/app.js': ['text/javascript; charset=utf-8', appScript],
  '/bundles/chat-runtime.js': ['text/javascript; charset=utf-8', chatScript],
};

await build({
  entryPoints: ['src/worker.js'],
  outfile: 'dist/server/index.js',
  bundle: true,
  format: 'esm',
  minify: true,
  plugins: [{
    name: 'site-assets',
    setup(builder) {
      builder.onResolve({ filter: /^lunaflow:assets$/ }, () => ({ path: 'assets', namespace: 'site' }));
      builder.onLoad({ filter: /^assets$/, namespace: 'site' }, () => ({
        contents: JSON.stringify(assets),
        loader: 'json',
      }));
    },
  }],
});
