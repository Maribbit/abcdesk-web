import { afterEach, describe, expect, it } from "vitest";
import type { ChangeSpec } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { createCodeMirrorEditor } from "./codemirror-editor";

const SOURCE = "X: 1\nT: Random\nM: 4/4\nK: C\nC D E F | G A B c |\n% note\nc B A G | F E D C |";

const INSERTS = ["C", "D", "|", " ", "%", ":", "\n", "[", "]", "K:", "X:", "2"];

function mount(value: string): { host: HTMLElement; view: EditorView } {
  const host = document.createElement("section");
  document.body.append(host);

  createCodeMirrorEditor({
    host,
    value,
    lineWrap: "disabled",
    label: "ABC source code",
    onChange: () => {},
    onCursorChange: () => {},
  });

  const view = EditorView.findFromDOM(host);
  if (!view) throw new Error("EditorView was not mounted into the host");

  return { host, view };
}

/** The rendered lines, class names and text, as the browser would show them. */
function renderedLines(host: HTMLElement): string[] {
  return Array.from(host.querySelectorAll(".cm-line")).map((line) => line.innerHTML);
}

/** A fixed-seed generator: a failure has to be reproducible. */
function random(seed: { value: number }): number {
  seed.value = (seed.value * 1664525 + 1013904223) % 4294967296;
  return seed.value / 4294967296;
}

function pick<T>(seed: { value: number }, items: readonly T[]): T {
  return items[Math.floor(random(seed) * items.length)];
}

/**
 * Edits of every shape an ABC file meets: typing a note, opening a comment,
 * deleting a header, breaking a line in two, joining two back together.
 */
function randomEdit(view: EditorView, seed: { value: number }): ChangeSpec {
  const length = view.state.doc.length;
  const from = Math.floor(random(seed) * (length + 1));
  const roll = random(seed);

  if (roll < 0.45) {
    return { from, insert: pick(seed, INSERTS) };
  }

  const span = 1 + Math.floor(random(seed) * 6);

  if (roll < 0.75) {
    return { from: Math.min(from, Math.max(length - span, 0)), to: Math.min(from + span, length) };
  }

  if (roll < 0.9) {
    return {
      from: Math.min(from, Math.max(length - span, 0)),
      to: Math.min(from + span, length),
      insert: pick(seed, INSERTS),
    };
  }

  // Break a line anywhere, or join one to the next.
  if (roll < 0.95) return { from, insert: "\n" };
  const line = view.state.doc.lineAt(from);
  return line.number < view.state.doc.lines
    ? { from: line.to, to: line.to + 1 }
    : { from: line.from };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("incremental syntax greys", () => {
  it("keeps every mark where a scan from scratch would put it", () => {
    const seed = { value: 20261103 };
    const { host, view } = mount(SOURCE);

    for (let step = 0; step < 120; step++) {
      view.dispatch({ changes: randomEdit(view, seed) });

      if (step % 15 !== 0 && step !== 119) continue;

      // The same text, painted once instead of patched: any drift between the
      // two shows up as a different line of markup.
      const fresh = mount(view.state.doc.toString());
      expect(renderedLines(host)).toEqual(renderedLines(fresh.host));
    }
  });
});
