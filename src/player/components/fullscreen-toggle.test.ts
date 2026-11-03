import { afterEach, describe, expect, it, vi } from "vitest";
import type { ABCDeskFullscreenToggleElement } from "./fullscreen-toggle";
import "./fullscreen-toggle";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fullscreen toggle", () => {
  it("hides itself when fullscreen support is unavailable", async () => {
    const element = document.createElement(
      "abcdesk-fullscreen-toggle",
    ) as ABCDeskFullscreenToggleElement;
    const target = document.createElement("div");

    Object.defineProperty(document, "fullscreenEnabled", {
      configurable: true,
      value: false,
    });
    target.requestFullscreen = vi.fn(() => Promise.resolve());
    document.body.append(element);

    element.setFullscreenTarget(target);
    await element.updateComplete;

    expect(element.hidden).toBe(true);
  });

  it("requests fullscreen from its configured target", async () => {
    const element = document.createElement(
      "abcdesk-fullscreen-toggle",
    ) as ABCDeskFullscreenToggleElement;
    const target = document.createElement("div");
    const requestFullscreen = vi.fn(() => Promise.resolve());

    Object.defineProperty(document, "fullscreenEnabled", {
      configurable: true,
      value: true,
    });
    target.requestFullscreen = requestFullscreen;
    document.body.append(element);

    element.setFullscreenTarget(target);
    await element.updateComplete;

    expect(element.hidden).toBe(false);
    expect(
      element
        .querySelector(".abcdesk-fullscreen-button")
        ?.getAttribute("aria-label"),
    ).toBe("Enter fullscreen");

    element
      .querySelector(".abcdesk-fullscreen-button")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(requestFullscreen).toHaveBeenCalledTimes(1);
  });
});