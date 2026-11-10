interface RegisterOptions {
  /** The page's own container; injectable so the decision can be tested. */
  container?: ServiceWorkerContainer | null;
  /** Where the app is deployed; `sw.js` sits beside it. */
  baseUrl?: string;
  /** Off in development: a cached shell would hide the server's changes. */
  enabled?: boolean;
}

/**
 * Teaches the tab to open without a network.
 *
 * The worker is registered beside the page rather than at the origin root, so
 * a deployment under `SITE_BASE` scopes its cache to its own subtree and can
 * never answer for another app on the same origin. A browser that refuses the
 * worker — private mode, an untrusted certificate, a policy — loses the
 * offline copy and nothing else, so the failure is reported and dropped.
 */
export function registerWorkspaceServiceWorker({
  container = typeof navigator === "undefined"
    ? null
    : (navigator.serviceWorker ?? null),
  baseUrl = import.meta.env.BASE_URL,
  enabled = import.meta.env.PROD,
}: RegisterOptions = {}): Promise<ServiceWorkerRegistration | null> {
  if (!enabled || !container) return Promise.resolve(null);

  return container
    .register(`${baseUrl}sw.js`, { scope: baseUrl })
    .catch((error) => {
      console.warn("[ABC Desk Web] Offline copy unavailable:", error);
      return null;
    });
}
