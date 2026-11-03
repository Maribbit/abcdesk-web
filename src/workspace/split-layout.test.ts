import { afterEach, describe, expect, it } from "vitest";
import type { LayoutMode } from "../shared/settings";
import { createWorkspaceSplitLayout } from "./split-layout";

function setRect(element: HTMLElement, rect: Partial<DOMRect>): void {
  element.getBoundingClientRect = () =>
    ({
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
      ...rect,
    }) as DOMRect;
}

function createLayout(
  options: {
    layoutMode?: LayoutMode;
    stackedMatches?: boolean;
  } = {},
) {
  const workspaceShell = document.createElement("section");
  const editorPane = document.createElement("section");
  const resizer = document.createElement("div");
  let layoutMode = options.layoutMode ?? "auto";

  setRect(workspaceShell, { height: 720, width: 1000 });
  setRect(editorPane, { height: 300, width: 400, top: 100 });
  setRect(resizer, { height: 8 });

  const splitLayout = createWorkspaceSplitLayout({
    editorPane,
    resizer,
    stackedLayoutQuery: { matches: options.stackedMatches ?? false },
    workspaceShell,
    getLayoutMode: () => layoutMode,
  });

  return {
    editorPane,
    resizer,
    splitLayout,
    workspaceShell,
    setLayoutMode: (nextLayoutMode: LayoutMode) => {
      layoutMode = nextLayoutMode;
    },
  };
}

describe("Workspace split layout", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("restores persisted desktop and mobile split sizes", () => {
    const { splitLayout, workspaceShell } = createLayout();
    window.localStorage.setItem("abcdeskWorkspaceDesktopSplit", "420px");
    window.localStorage.setItem("abcdeskWorkspaceMobileSplit", "260px");

    splitLayout.restoreSizes();

    expect(workspaceShell.style.getPropertyValue("--workspace-editor-size")).toBe(
      "420px",
    );
    expect(
      workspaceShell.style.getPropertyValue("--workspace-editor-mobile-size"),
    ).toBe("260px");
  });

  it("updates resizer orientation from layout mode and media query state", () => {
    const { resizer, splitLayout, setLayoutMode } = createLayout({
      stackedMatches: true,
    });

    splitLayout.updateOrientation();
    expect(resizer.getAttribute("aria-orientation")).toBe("horizontal");

    setLayoutMode("horizontal");
    splitLayout.updateOrientation();
    expect(resizer.getAttribute("aria-orientation")).toBe("vertical");

    setLayoutMode("vertical");
    splitLayout.updateOrientation();
    expect(resizer.getAttribute("aria-orientation")).toBe("horizontal");
  });

  it("resizes the desktop split with keyboard arrows and clamps to bounds", () => {
    const { editorPane, splitLayout, workspaceShell } = createLayout({
      layoutMode: "horizontal",
    });
    setRect(editorPane, { width: 670 });

    splitLayout.handleKeydown(
      new KeyboardEvent("keydown", { key: "ArrowRight" }),
    );

    expect(workspaceShell.style.getPropertyValue("--workspace-editor-size")).toBe(
      "680px",
    );
    expect(window.localStorage.getItem("abcdeskWorkspaceDesktopSplit")).toBe(
      "680px",
    );
  });
});
