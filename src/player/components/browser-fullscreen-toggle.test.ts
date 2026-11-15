import { afterEach, describe, expect, it, vi } from "vitest";
import type { ABCDeskBrowserFullscreenToggleElement } from "./browser-fullscreen-toggle";
import "./browser-fullscreen-toggle";

afterEach(() => {
  vi.restoreAllMocks();
  // Clean up any data attribute left on host elements
  document
    .querySelectorAll("[data-abcdesk-browser-fullscreen]")
    .forEach((el) => {
      if (el instanceof HTMLElement) {
        delete el.dataset.abcdeskBrowserFullscreen;
      }
    });
});

describe("browser fullscreen toggle", () => {
  it("starts with isBrowserFullscreen false", async () => {
    const element = document.createElement(
      "abcdesk-browser-fullscreen-toggle",
    ) as ABCDeskBrowserFullscreenToggleElement;
    document.body.append(element);
    await element.updateComplete;

    expect(element.isBrowserFullscreen).toBe(false);
    expect(
      element
        .querySelector(".abcdesk-browser-fullscreen-button")
        ?.getAttribute("aria-label"),
    ).toBe("Enter browser fullscreen");
    // Nothing has been entered, so there is no way out to spell yet.
    expect(
      element
        .querySelector(".abcdesk-browser-fullscreen-button")
        ?.getAttribute("title"),
    ).toBe("Enter browser fullscreen");
  });

  it("enters browser fullscreen on click and sets data attribute", async () => {
    const host = document.createElement("div");
    const element = document.createElement(
      "abcdesk-browser-fullscreen-toggle",
    ) as ABCDeskBrowserFullscreenToggleElement;
    document.body.append(host, element);
    element.setHostElement(host);
    await element.updateComplete;

    element
      .querySelector(".abcdesk-browser-fullscreen-button")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await element.updateComplete;

    expect(element.isBrowserFullscreen).toBe(true);
    expect(host.dataset.abcdeskBrowserFullscreen).toBe("true");
    expect(
      element
        .querySelector(".abcdesk-browser-fullscreen-button")
        ?.getAttribute("aria-label"),
    ).toBe("Exit browser fullscreen");
    // Escape leaves the fullscreen too, so the tooltip names it.
    expect(
      element
        .querySelector(".abcdesk-browser-fullscreen-button")
        ?.getAttribute("title"),
    ).toBe("Exit browser fullscreen (Esc)");
  });

  it("exits browser fullscreen on second click and removes data attribute", async () => {
    const host = document.createElement("div");
    const element = document.createElement(
      "abcdesk-browser-fullscreen-toggle",
    ) as ABCDeskBrowserFullscreenToggleElement;
    document.body.append(host, element);
    element.setHostElement(host);
    await element.updateComplete;

    // Enter
    element
      .querySelector(".abcdesk-browser-fullscreen-button")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await element.updateComplete;
    expect(host.dataset.abcdeskBrowserFullscreen).toBe("true");

    // Exit
    element
      .querySelector(".abcdesk-browser-fullscreen-button")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await element.updateComplete;

    expect(element.isBrowserFullscreen).toBe(false);
    expect(host.dataset.abcdeskBrowserFullscreen).toBeUndefined();
    expect(
      element
        .querySelector(".abcdesk-browser-fullscreen-button")
        ?.getAttribute("aria-label"),
    ).toBe("Enter browser fullscreen");
  });

  it("exits browser fullscreen on Escape keydown", async () => {
    const host = document.createElement("div");
    const element = document.createElement(
      "abcdesk-browser-fullscreen-toggle",
    ) as ABCDeskBrowserFullscreenToggleElement;
    document.body.append(host, element);
    element.setHostElement(host);
    await element.updateComplete;

    // Enter
    element
      .querySelector(".abcdesk-browser-fullscreen-button")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await element.updateComplete;
    expect(element.isBrowserFullscreen).toBe(true);

    // Press Escape
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await element.updateComplete;

    expect(element.isBrowserFullscreen).toBe(false);
    expect(host.dataset.abcdeskBrowserFullscreen).toBeUndefined();
  });

  it("does not exit on Escape when not in browser fullscreen", async () => {
    const host = document.createElement("div");
    const element = document.createElement(
      "abcdesk-browser-fullscreen-toggle",
    ) as ABCDeskBrowserFullscreenToggleElement;
    document.body.append(host, element);
    element.setHostElement(host);
    await element.updateComplete;

    // Press Escape while not fullscreen
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await element.updateComplete;

    expect(element.isBrowserFullscreen).toBe(false);
  });

  it("reads initial state from host data attribute", async () => {
    const host = document.createElement("div");
    host.dataset.abcdeskBrowserFullscreen = "true";
    const element = document.createElement(
      "abcdesk-browser-fullscreen-toggle",
    ) as ABCDeskBrowserFullscreenToggleElement;
    document.body.append(host, element);
    element.setHostElement(host);
    await element.updateComplete;

    expect(element.isBrowserFullscreen).toBe(true);
    expect(
      element
        .querySelector(".abcdesk-browser-fullscreen-button")
        ?.getAttribute("aria-label"),
    ).toBe("Exit browser fullscreen");
  });

  it("dispatches a custom event on toggle", async () => {
    const host = document.createElement("div");
    const element = document.createElement(
      "abcdesk-browser-fullscreen-toggle",
    ) as ABCDeskBrowserFullscreenToggleElement;
    document.body.append(host, element);
    element.setHostElement(host);
    await element.updateComplete;

    const eventSpy = vi.fn();
    element.addEventListener("abcdesk-browser-fullscreen-toggle", eventSpy);

    // Enter
    element
      .querySelector(".abcdesk-browser-fullscreen-button")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await element.updateComplete;

    expect(eventSpy).toHaveBeenCalledTimes(1);
    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { isBrowserFullscreen: true },
      }),
    );

    // Exit
    element
      .querySelector(".abcdesk-browser-fullscreen-button")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await element.updateComplete;

    expect(eventSpy).toHaveBeenCalledTimes(2);
    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { isBrowserFullscreen: false },
      }),
    );
  });

  it("toggles aria-pressed attribute", async () => {
    const host = document.createElement("div");
    const element = document.createElement(
      "abcdesk-browser-fullscreen-toggle",
    ) as ABCDeskBrowserFullscreenToggleElement;
    document.body.append(host, element);
    element.setHostElement(host);
    await element.updateComplete;

    const button = element.querySelector(
      ".abcdesk-browser-fullscreen-button",
    );

    expect(button?.getAttribute("aria-pressed")).toBe("false");

    // Enter
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await element.updateComplete;
    expect(button?.getAttribute("aria-pressed")).toBe("true");

    // Exit
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await element.updateComplete;
    expect(button?.getAttribute("aria-pressed")).toBe("false");
  });
});
