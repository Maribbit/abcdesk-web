import { describe, expect, it, vi } from "vitest";
import { installPlayShortcut, isPlayShortcut } from "./play-shortcut";

function buildDocument(markup = "<p>Sheet</p>"): Document {
  const document = window.document.implementation.createHTMLDocument("desk");
  document.body.innerHTML = markup;
  return document;
}

function press(
  document: Document,
  overrides: KeyboardEventInit = {},
  target?: EventTarget,
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key: "Enter",
    bubbles: true,
    cancelable: true,
    ...overrides,
  });
  (target ?? document.body).dispatchEvent(event);
  return event;
}

describe("isPlayShortcut", () => {
  it("claims the page's own modifier plus Enter", () => {
    const document = buildDocument();
    expect(isPlayShortcut(press(document, { metaKey: true }), document)).toBe(true);
    expect(isPlayShortcut(press(document, { ctrlKey: true }), document)).toBe(true);
  });

  it("leaves a bare Enter and the shifted forms alone", () => {
    const document = buildDocument();
    expect(isPlayShortcut(press(document), document)).toBe(false);
    expect(isPlayShortcut(press(document, { metaKey: true, shiftKey: true }), document)).toBe(
      false,
    );
    expect(isPlayShortcut(press(document, { metaKey: true, altKey: true }), document)).toBe(
      false,
    );
    expect(isPlayShortcut(press(document, { key: "z", metaKey: true }), document)).toBe(false);
  });

  it("stays out of a key the editor has already claimed", () => {
    const document = buildDocument();
    const event = press(document, { metaKey: true });
    event.preventDefault();
    expect(isPlayShortcut(event, document)).toBe(false);
  });

  it("waits for the input method to finish composing", () => {
    const document = buildDocument();
    expect(
      isPlayShortcut(press(document, { metaKey: true, isComposing: true }), document),
    ).toBe(false);
  });

  it("does not play behind an open sheet", () => {
    const document = buildDocument('<dialog open><p>About</p></dialog>');
    expect(isPlayShortcut(press(document, { metaKey: true }), document)).toBe(false);
  });

  it("does not steal the key from a text field", () => {
    const document = buildDocument(
      '<input value="tempo" /><div contenteditable="true"></div>',
    );
    const input = document.querySelector("input")!;
    expect(isPlayShortcut(press(document, { metaKey: true }, input), document)).toBe(false);
    const box = document.querySelector('[contenteditable="true"]')!;
    expect(isPlayShortcut(press(document, { metaKey: true }, box), document)).toBe(false);
  });

  it("sees the field behind a shadow root's host", () => {
    const document = buildDocument('<div id="transport"></div>');
    const host = document.getElementById("transport")!;
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = '<input class="tempo" />';
    const play = vi.fn();
    installPlayShortcut(document, play);

    // The document listener sees the host as the target; the path still starts
    // at the field, so the key belongs to the tempo box and not to the page.
    press(document, { metaKey: true }, root.querySelector("input")!);
    expect(play).not.toHaveBeenCalled();
  });
});

describe("installPlayShortcut", () => {
  it("plays once per press and stops when disposed", () => {
    const document = buildDocument();
    const play = vi.fn();
    const dispose = installPlayShortcut(document, play);

    const claimed = press(document, { metaKey: true });
    expect(play).toHaveBeenCalledTimes(1);
    expect(claimed.defaultPrevented).toBe(true);

    dispose();
    press(document, { metaKey: true });
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("says nothing on a bare Enter", () => {
    const document = buildDocument();
    const play = vi.fn();
    installPlayShortcut(document, play);
    press(document);
    expect(play).not.toHaveBeenCalled();
  });
});
