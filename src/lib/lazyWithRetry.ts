import React, { ComponentType, lazy, LazyExoticComponent } from 'react';

/**
 * Resilient lazy loader for route-based code splitting.
 *
 * Automatically recovers from dynamic import failures caused by:
 * 1. Rolling production deployments (where chunk hashes change and previous chunks are replaced)
 * 2. Stale browser/CDN asset references
 * 3. Transient network drops during chunk downloads
 *
 * When a chunk loading failure occurs, it initiates a single automated cache-busting
 * reload to fetch the latest application manifest. A session storage guard prevents
 * infinite reload loops if the network is genuinely disconnected.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T } | any>,
  pageName: string = 'component'
): LazyExoticComponent<T> {
  return lazy(async () => {
    const retryKey = `crm_chunk_retry_${pageName}`;
    const alreadyRetried = typeof window !== 'undefined' && window.sessionStorage.getItem(retryKey) === 'true';

    try {
      const module = await componentImport();
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(retryKey);
      }
      return module && module.default ? module : { default: module };
    } catch (error: any) {
      console.warn(`[lazyWithRetry] Error loading chunk for ${pageName}:`, error);

      const message = (error?.message || '').toLowerCase();
      const isChunkLoadError =
        message.includes('failed to fetch dynamically imported module') ||
        message.includes('importing a module script failed') ||
        message.includes('error loading dynamically imported module') ||
        message.includes('load chunk') ||
        message.includes('loading chunk') ||
        error?.name === 'ChunkLoadError';

      if (isChunkLoadError && typeof window !== 'undefined' && !alreadyRetried) {
        window.sessionStorage.setItem(retryKey, 'true');
        console.info(`[lazyWithRetry] Chunk version mismatch detected for ${pageName}. Auto-refreshing to load latest version...`);

        // Clear any service worker or browser caches if available
        if ('caches' in window) {
          try {
            const cacheKeys = await window.caches.keys();
            await Promise.all(cacheKeys.map(k => window.caches.delete(k)));
          } catch {
            // Non-blocking cache cleanup failure
          }
        }

        // Force reload from server to fetch the latest index.html and newly hashed chunks
        window.location.reload();

        // Return an unresolved promise to prevent the ErrorBoundary from flashing during reload
        return new Promise(() => {});
      }

      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(retryKey);
      }
      throw error;
    }
  });
}
