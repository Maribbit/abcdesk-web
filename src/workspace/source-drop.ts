interface SourceDropOptions {
  /** The pane a file is dropped on, and the one that lights up for the drag. */
  pane: HTMLElement;
  openFile: (file: File) => void;
}

/**
 * Dropping a file on the source pane opens it, the same way the Open button
 * does — the drop is a file picker that costs one gesture instead of three.
 *
 * Two browser habits have to be answered for: a drop is allowed only where a
 * `dragover` handler says so, and everywhere else the same drop would navigate
 * the page to the file, taking the workspace with it. So the pane claims the
 * drops it wants and the window quietly refuses the rest.
 *
 * The drag depth is counted rather than read from `dragleave` alone: moving
 * between the pane and its own children fires a leave for every child entered.
 */
export function createSourceDropTarget({
  pane,
  openFile,
}: SourceDropOptions): void {
  let depth = 0;

  const showDrag = (active: boolean) => {
    if (active) pane.dataset.dropActive = "true";
    else delete pane.dataset.dropActive;
  };

  const carriesFile = (event: DragEvent): boolean =>
    Array.from(event.dataTransfer?.types ?? []).includes("Files");

  pane.addEventListener("dragenter", (event) => {
    if (!carriesFile(event)) return;
    event.preventDefault();
    depth += 1;
    showDrag(true);
  });

  pane.addEventListener("dragover", (event) => {
    if (!carriesFile(event)) return;
    // Claiming the drop is what stops the browser from opening the file itself.
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  });

  pane.addEventListener("dragleave", (event) => {
    if (!carriesFile(event)) return;
    depth = Math.max(depth - 1, 0);
    if (depth === 0) showDrag(false);
  });

  pane.addEventListener("drop", (event) => {
    if (!carriesFile(event)) return;
    event.preventDefault();
    depth = 0;
    showDrag(false);

    const [file] = Array.from(event.dataTransfer?.files ?? []);
    if (file) openFile(file);
  });

  const refuse = (event: DragEvent) => {
    if (carriesFile(event)) event.preventDefault();
  };
  window.addEventListener("dragover", refuse);
  window.addEventListener("drop", refuse);
}
