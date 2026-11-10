import { describe, expect, it, vi } from "vitest";
import { createSourceDropTarget } from "./source-drop";

/**
 * jsdom has no `DataTransfer`, so a drag is a plain event wearing one: the
 * module only ever reads `types` and `files` from it.
 */
function dragEvent(
  type: string,
  transfer?: { types: string[]; files?: File[] },
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: transfer });
  return event;
}

function fileTransfer(...files: File[]) {
  return { types: ["Files"], files };
}

function mountPane(): { pane: HTMLElement; child: HTMLElement } {
  const pane = document.createElement("div");
  const child = document.createElement("div");
  pane.append(child);
  document.body.append(pane);
  return { pane, child };
}

describe("Source drop target", () => {
  it("opens the file dropped on the pane", () => {
    const { pane } = mountPane();
    const openFile = vi.fn();
    createSourceDropTarget({ pane, openFile });
    const file = new File(["X: 1"], "tune.abc");

    pane.dispatchEvent(dragEvent("dragenter", fileTransfer(file)));
    expect(pane.dataset.dropActive).toBe("true");

    pane.dispatchEvent(dragEvent("drop", fileTransfer(file)));

    expect(openFile).toHaveBeenCalledWith(file);
    expect(pane.dataset.dropActive).toBeUndefined();
  });

  it("keeps the highlight until the drag leaves the pane itself", () => {
    const { pane, child } = mountPane();
    createSourceDropTarget({ pane, openFile: vi.fn() });

    pane.dispatchEvent(dragEvent("dragenter", fileTransfer()));
    // Entering a child fires another enter, then the leave of the element
    // left behind: the pane must survive both.
    child.dispatchEvent(dragEvent("dragenter", fileTransfer()));
    child.dispatchEvent(dragEvent("dragleave", fileTransfer()));
    expect(pane.dataset.dropActive).toBe("true");

    pane.dispatchEvent(dragEvent("dragleave", fileTransfer()));
    expect(pane.dataset.dropActive).toBeUndefined();
  });

  it("lets a drag of text through untouched", () => {
    const { pane } = mountPane();
    const openFile = vi.fn();
    createSourceDropTarget({ pane, openFile });
    const text = { types: ["text/plain"] };

    const enter = dragEvent("dragenter", text);
    pane.dispatchEvent(enter);
    const drop = dragEvent("drop", text);
    pane.dispatchEvent(drop);

    expect(pane.dataset.dropActive).toBeUndefined();
    expect(openFile).not.toHaveBeenCalled();
    expect(enter.defaultPrevented).toBe(false);
    expect(drop.defaultPrevented).toBe(false);
  });

  it("refuses a file dropped anywhere else, so the page stays put", () => {
    const { pane } = mountPane();
    createSourceDropTarget({ pane, openFile: vi.fn() });

    const over = dragEvent("dragover", fileTransfer());
    window.dispatchEvent(over);
    const drop = dragEvent("drop", fileTransfer());
    window.dispatchEvent(drop);

    expect(over.defaultPrevented).toBe(true);
    expect(drop.defaultPrevented).toBe(true);
  });
});
