import { describe, expect, it, vi } from "vitest";
import {
  installTransportShortcuts,
  isPlayShortcut,
  isToggleShortcut,
} from "./play-shortcut";

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

function stubShortcuts() {
  return { playFromCaret: vi.fn(), togglePlayback: vi.fn() };
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
    const shortcuts = stubShortcuts();
    installTransportShortcuts(document, shortcuts);

    // The document listener sees the host as the target; the path still starts
    // at the field, so the key belongs to the tempo box and not to the page.
    press(document, { metaKey: true }, root.querySelector("input")!);
    press(document, { key: " " }, root.querySelector("input")!);
    expect(shortcuts.playFromCaret).not.toHaveBeenCalled();
    expect(shortcuts.togglePlayback).not.toHaveBeenCalled();
  });
});

describe("isToggleShortcut", () => {
  it("claims the bare space bar", () => {
    const document = buildDocument();
    expect(isToggleShortcut(press(document, { key: " " }), document)).toBe(true);
  });

  it("leaves every modified space to the browser and the system", () => {
    const document = buildDocument();
    for (const modifier of ["metaKey", "ctrlKey", "altKey", "shiftKey"] as const) {
      expect(isToggleShortcut(press(document, { key: " ", [modifier]: true }), document)).toBe(
        false,
      );
    }
  });

  it("keeps the space that types a note, and the space that presses a button", () => {
    const document = buildDocument(
      '<textarea></textarea><div contenteditable="true"></div><button>Play</button>',
    );
    for (const selector of ["textarea", '[contenteditable="true"]', "button"]) {
      const target = document.querySelector(selector)!;
      expect(isToggleShortcut(press(document, { key: " " }, target), document)).toBe(false);
    }
  });

  it("stays out of a key something else has claimed, and out of an open sheet", () => {
    const document = buildDocument();
    const claimed = press(document, { key: " " });
    claimed.preventDefault();
    expect(isToggleShortcut(claimed, document)).toBe(false);
    expect(isToggleShortcut(press(document, { key: " ", isComposing: true }), document)).toBe(
      false,
    );

    const covered = buildDocument("<dialog open><p>About</p></dialog>");
    expect(isToggleShortcut(press(covered, { key: " " }), covered)).toBe(false);
  });
});

describe("installTransportShortcuts", () => {
  it("sends each verb to its own action, once per press, until disposed", () => {
    const document = buildDocument();
    const shortcuts = stubShortcuts();
    const dispose = installTransportShortcuts(document, shortcuts);

    const fromCaret = press(document, { metaKey: true });
    expect(fromCaret.defaultPrevented).toBe(true);
    const toggle = press(document, { key: " " });
    expect(toggle.defaultPrevented).toBe(true);
    expect(shortcuts.playFromCaret).toHaveBeenCalledTimes(1);
    expect(shortcuts.togglePlayback).toHaveBeenCalledTimes(1);

    dispose();
    press(document, { metaKey: true });
    press(document, { key: " " });
    expect(shortcuts.playFromCaret).toHaveBeenCalledTimes(1);
    expect(shortcuts.togglePlayback).toHaveBeenCalledTimes(1);
  });

  it("says nothing on a bare Enter", () => {
    const document = buildDocument();
    const shortcuts = stubShortcuts();
    installTransportShortcuts(document, shortcuts);
    press(document);
    expect(shortcuts.playFromCaret).not.toHaveBeenCalled();
    expect(shortcuts.togglePlayback).not.toHaveBeenCalled();
  });
});
