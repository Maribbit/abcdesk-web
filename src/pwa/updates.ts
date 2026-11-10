/**
 * Reports the one moment worth interrupting a reader for: a new build has
 * finished installing and is waiting to take over.
 *
 * The worker is deliberately not activated on its own, because activation
 * deletes the previous shell — a page still running the old code would then
 * ask for files that no longer exist under it. This page is told, and only a
 * reload (which is also the request to skip waiting) makes the swap.
 *
 * Only a worker with someone to replace is an update: on a first install there
 * is no active worker, the worker takes over at once, and there is nothing to
 * announce. A worker already waiting when the page loads was installed by
 * another tab; it is just as ready, so it is considered first.
 */
export function watchWorkspaceUpdates(
  registration: ServiceWorkerRegistration,
  onUpdateReady: (worker: ServiceWorker) => void,
): void {
  const consider = (worker: ServiceWorker | null): void => {
    if (!worker || worker.state !== "installed") return;

    const active = registration.active;
    if (!active || active === worker) return;

    onUpdateReady(worker);
  };

  consider(registration.waiting);

  registration.addEventListener("updatefound", () => {
    const installing = registration.installing;
    if (!installing) return;

    installing.addEventListener("statechange", () => consider(installing));
    consider(installing);
  });
}
