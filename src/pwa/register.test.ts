import { describe, expect, it, vi } from "vitest";
import { registerWorkspaceServiceWorker } from "./register";

type Register = (
  url: string,
  options: RegistrationOptions,
) => Promise<ServiceWorkerRegistration>;

function fakeContainer(register: Register): ServiceWorkerContainer {
  return { register } as unknown as ServiceWorkerContainer;
}

describe("service worker registration", () => {
  it("registers the worker beside the page and scopes it to the deployment", async () => {
    const registration = { scope: "/workspace/" } as ServiceWorkerRegistration;
    const register = vi.fn(async () => registration);

    const result = await registerWorkspaceServiceWorker({
      container: fakeContainer(register),
      baseUrl: "/workspace/",
      enabled: true,
    });

    expect(register).toHaveBeenCalledWith("/workspace/sw.js", {
      scope: "/workspace/",
    });
    expect(result).toBe(registration);
  });

  it("stays out of the way outside a production build", async () => {
    const register = vi.fn(async () => ({}) as ServiceWorkerRegistration);

    const result = await registerWorkspaceServiceWorker({
      container: fakeContainer(register),
      baseUrl: "/",
      enabled: false,
    });

    expect(register).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("loses only the offline copy when the browser refuses the worker", async () => {
    const refusal = new Error("SecurityError");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(
      registerWorkspaceServiceWorker({
        container: fakeContainer(async () => {
          throw refusal;
        }),
        baseUrl: "/",
        enabled: true,
      }),
    ).resolves.toBeNull();

    expect(warn).toHaveBeenCalledWith(
      "[ABC Desk Web] Offline copy unavailable:",
      refusal,
    );
    warn.mockRestore();
  });
});
