import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

// Mock browser globals for node testing
class MockSessionStorage {
  private store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] || null; }
  setItem(key: string, val: string) { this.store[key] = val; }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
}

describe('Dynamic Module Import Recovery & Resilient Code Splitting', () => {
  let mockStorage: MockSessionStorage;
  let reloaded = false;

  beforeEach(() => {
    mockStorage = new MockSessionStorage();
    reloaded = false;
    (global as any).window = {
      sessionStorage: mockStorage,
      location: {
        reload: () => { reloaded = true; }
      },
      caches: {
        keys: async () => ['workbox-precache', 'runtime-cache'],
        delete: async (_key: string) => true
      }
    };
  });

  it('detects typical chunk loading errors across various browsers and bundlers', () => {
    const errorStrings = [
      'Failed to fetch dynamically imported module: https://placify.auriic.co/assets/Candidates-1CnbVDpv.js',
      'TypeError: Failed to fetch dynamically imported module',
      'Importing a module script failed.',
      'error loading dynamically imported module',
      'Loading chunk 25 failed.',
      'ChunkLoadError: Loading chunk 25 failed.'
    ];

    const isChunkLoadError = (message: string) => {
      const msg = message.toLowerCase();
      return (
        msg.includes('failed to fetch dynamically imported module') ||
        msg.includes('importing a module script failed') ||
        msg.includes('error loading dynamically imported module') ||
        msg.includes('load chunk') ||
        msg.includes('loading chunk') ||
        msg.includes('chunkloaderror')
      );
    };

    for (const err of errorStrings) {
      assert.strictEqual(isChunkLoadError(err), true, `Failed to match chunk error: ${err}`);
    }

    // Normal application errors should not be classified as chunk errors
    assert.strictEqual(isChunkLoadError('Cannot read properties of undefined'), false);
    assert.strictEqual(isChunkLoadError('Network request failed with 500 Internal Server Error'), false);
  });

  it('verifies that vercel.json prevents rewriting /assets/ to /index.html and configures cache headers', () => {
    const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
    assert.strictEqual(fs.existsSync(vercelConfigPath), true);

    const vercelJson = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));

    // Verify rewrites exclude /assets/
    const spaRewrite = vercelJson.rewrites.find((r: any) => r.destination === '/index.html');
    assert.ok(spaRewrite, 'SPA rewrite to /index.html must exist');
    assert.ok(
      spaRewrite.source.includes('assets/'),
      'SPA rewrite pattern must exclude /assets/ so missing JS chunks return 404 instead of HTML'
    );

    // Verify cache headers
    const assetsHeader = vercelJson.headers.find((h: any) => h.source.startsWith('/assets'));
    assert.ok(assetsHeader, 'Cache header rule for /assets/ must exist');
    const assetCacheControl = assetsHeader.headers.find((h: any) => h.key.toLowerCase() === 'cache-control');
    assert.ok(assetCacheControl.value.includes('immutable'), 'Static assets must have immutable cache header');

    const htmlHeader = vercelJson.headers.find((h: any) => !h.source.startsWith('/assets'));
    assert.ok(htmlHeader, 'Cache header rule for non-assets must exist');
    const htmlCacheControl = htmlHeader.headers.find((h: any) => h.key.toLowerCase() === 'cache-control');
    assert.ok(
      htmlCacheControl.value.includes('no-cache'),
      'HTML / SPA routes must have no-cache headers to prevent stale manifest chunk references'
    );
  });

  it('verifies index.html contains anti-cache meta tags for immediate update delivery', () => {
    const indexPath = path.join(process.cwd(), 'index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf8');

    assert.ok(indexContent.includes('http-equiv="Cache-Control"'));
    assert.ok(indexContent.includes('no-cache'));
    assert.ok(indexContent.includes('no-store'));
  });

  it('verifies server.ts does not serve index.html for missing asset files in production', () => {
    const serverPath = path.join(process.cwd(), 'server.ts');
    const serverContent = fs.readFileSync(serverPath, 'utf8');

    assert.ok(
      serverContent.includes("req.path.startsWith('/assets/')"),
      'server.ts must explicitly handle /assets/ to prevent serving index.html on missing chunks'
    );
    assert.ok(
      serverContent.includes("fallthrough: false"),
      'server.ts express.static for /assets must have fallthrough disabled'
    );
  });

  it('verifies src/App.tsx lazy routes use lazyWithRetry across all page modules', () => {
    const appPath = path.join(process.cwd(), 'src', 'App.tsx');
    const appContent = fs.readFileSync(appPath, 'utf8');

    // Confirm lazyWithRetry is imported
    assert.ok(appContent.includes("import { lazyWithRetry } from './lib/lazyWithRetry'"));

    // Confirm Candidates page uses lazyWithRetry
    assert.ok(
      appContent.includes("const Candidates = lazyWithRetry("),
      'Candidates component must be wrapped with lazyWithRetry'
    );

    // Confirm no raw lazy() without retry is used for page routes
    assert.strictEqual(
      appContent.includes("= lazy(() => import("),
      false,
      'All page routes should use lazyWithRetry instead of bare React.lazy'
    );
  });
});
