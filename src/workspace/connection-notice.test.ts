import { describe, expect, it } from "vitest";
import { watchConnectionNotice } from "./connection-notice";

function createNotice() {
  const element = document.createElement("span");
  element.hidden = true;
  return element;
}

describe("connection notice", () => {
  it("shows the label on an offline page", () => {
    const element = createNotice();

    watchConnectionNotice({
      element,
      online: () => false,
      controlled: () => false,
      target: new EventTarget(),
    });

    expect(element.hidden).toBe(false);
    expect(element.title).toBe("No network");
  });

  it("promises the saved copy only when a worker serves it", () => {
    const element = createNotice();

    watchConnectionNotice({
      element,
      online: () => false,
      controlled: () => true,
      target: new EventTarget(),
    });

    expect(element.title).toMatch(/saved copy/);
  });

  it("follows the connection while the page stays open", () => {
    const element = createNotice();
    const target = new EventTarget();
    let isOnline = true;

    watchConnectionNotice({
      element,
      online: () => isOnline,
      controlled: () => true,
      target,
    });
    expect(element.hidden).toBe(true);
    expect(element.title).toBe("");

    isOnline = false;
    target.dispatchEvent(new Event("offline"));
    expect(element.hidden).toBe(false);

    isOnline = true;
    target.dispatchEvent(new Event("online"));
    expect(element.hidden).toBe(true);
    expect(element.title).toBe("");
  });

  it("stops listening when the workspace is torn down", () => {
    const element = createNotice();
    const target = new EventTarget();
    let isOnline = true;

    const stop = watchConnectionNotice({
      element,
      online: () => isOnline,
      controlled: () => false,
      target,
    });
    stop();

    isOnline = false;
    target.dispatchEvent(new Event("offline"));

    expect(element.hidden).toBe(true);
  });
});
