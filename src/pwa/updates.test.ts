import { describe, expect, it, vi } from "vitest";
import { watchWorkspaceUpdates } from "./updates";

interface FakeWorker {
  worker: ServiceWorker;
  setState: (state: ServiceWorkerState) => void;
}

function fakeWorker(state: ServiceWorkerState = "installed"): FakeWorker {
  const listeners: (() => void)[] = [];
  const worker = {
    state,
    addEventListener: (type: string, listener: () => void) => {
      if (type === "statechange") listeners.push(listener);
    },
  } as unknown as ServiceWorker;

  return {
    worker,
    setState: (next) => {
      (worker as { state: ServiceWorkerState }).state = next;
      for (const listener of listeners) listener();
    },
  };
}

function fakeRegistration(initial: {
  active?: ServiceWorker | null;
  waiting?: ServiceWorker | null;
  installing?: ServiceWorker | null;
}) {
  const listeners: Record<string, (() => void)[]> = {};
  const registration = {
    active: initial.active ?? null,
    waiting: initial.waiting ?? null,
    installing: initial.installing ?? null,
    addEventListener: (type: string, listener: () => void) => {
      (listeners[type] ??= []).push(listener);
    },
  } as unknown as ServiceWorkerRegistration;

  return {
    registration,
    fire: (type: string) => {
      for (const listener of listeners[type] ?? []) listener();
    },
  };
}

describe("service worker updates", () => {
  it("stays quiet on a first install, where there is nobody to replace", () => {
    const { worker } = fakeWorker();
    const { registration } = fakeRegistration({ waiting: worker });
    const onUpdateReady = vi.fn();

    watchWorkspaceUpdates(registration, onUpdateReady);

    expect(onUpdateReady).not.toHaveBeenCalled();
  });

  it("offers a worker another tab has already installed", () => {
    const { worker } = fakeWorker();
    const { registration } = fakeRegistration({
      active: fakeWorker().worker,
      waiting: worker,
    });
    const onUpdateReady = vi.fn();

    watchWorkspaceUpdates(registration, onUpdateReady);

    expect(onUpdateReady).toHaveBeenCalledWith(worker);
  });

  it("waits for the installing worker to finish before speaking", () => {
    const { worker, setState } = fakeWorker("installing");
    const { registration, fire } = fakeRegistration({
      active: fakeWorker().worker,
      installing: worker,
    });
    const onUpdateReady = vi.fn();

    watchWorkspaceUpdates(registration, onUpdateReady);
    fire("updatefound");
    expect(onUpdateReady).not.toHaveBeenCalled();

    setState("installed");
    expect(onUpdateReady).toHaveBeenCalledWith(worker);
  });

  it("does not mistake a failed install for an update", () => {
    const { worker, setState } = fakeWorker("installing");
    const { registration, fire } = fakeRegistration({
      active: fakeWorker().worker,
      installing: worker,
    });
    const onUpdateReady = vi.fn();

    watchWorkspaceUpdates(registration, onUpdateReady);
    fire("updatefound");
    setState("redundant");

    expect(onUpdateReady).not.toHaveBeenCalled();
  });
});
