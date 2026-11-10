import {
  downloadAbcSource,
  getAbcSourceDownloadFilename,
  importAbcFile,
} from "../shared/abc-file";
import { encodeWorkspaceAbcHash } from "../shared/workspace-url";

interface SourceStatsTargets {
  copySourceButton: HTMLButtonElement;
  exportAbcButton: HTMLButtonElement;
  shareButton: HTMLButtonElement;
  sourceStats: HTMLElement;
}

interface OpenWorkspaceAbcFileOptions {
  file: File;
  importAbcButton: HTMLButtonElement;
  qualityPanel: HTMLElement;
  renderCurrentInput: () => void;
  renderStatus: HTMLElement;
  setInputValue: (value: string) => void;
}

interface ImportWorkspaceAbcFileOptions extends Omit<
  OpenWorkspaceAbcFileOptions,
  "file"
> {
  abcFileInput: HTMLInputElement;
}

export function getSourceStatsText(sourceText: string): string {
  // Counted rather than split: this runs on every keystroke, and a thousand-line
  // tune should not leave a thousand short strings behind each time.
  let lineCount = sourceText.length === 0 ? 0 : 1;
  let newline = sourceText.indexOf("\n");
  while (newline !== -1) {
    lineCount += 1;
    newline = sourceText.indexOf("\n", newline + 1);
  }
  return `${lineCount} lines, ${sourceText.length} chars`;
}

export function updateWorkspaceSourceStats(
  targets: SourceStatsTargets,
  sourceText: string,
): void {
  const characterCount = sourceText.length;
  targets.sourceStats.textContent = getSourceStatsText(sourceText);
  targets.copySourceButton.disabled = characterCount === 0;
  targets.exportAbcButton.disabled = characterCount === 0;
  targets.shareButton.disabled = characterCount === 0;
}

export async function copyWorkspaceSourceToClipboard(
  sourceText: string,
  sourceStats: HTMLElement,
  updateSourceStats: () => void,
): Promise<void> {
  try {
    await navigator.clipboard.writeText(sourceText);
    sourceStats.textContent = "Copied";
  } catch (error) {
    console.error("[ABC Desk Web] Copy failed:", error);
    sourceStats.textContent = "Copy failed";
  }

  window.setTimeout(updateSourceStats, 1200);
}

/**
 * The share link is the tune itself, compressed into the fragment, so it needs
 * no server and no account: whoever opens it lands in the same workspace with
 * the same music. Origin and path are taken from the page rather than written
 * here, because the workspace is deployed under whatever path `SITE_BASE` says.
 */
export async function copyWorkspaceShareLink(
  sourceText: string,
  sourceStats: HTMLElement,
  updateSourceStats: () => void,
): Promise<void> {
  const { origin, pathname } = window.location;

  try {
    const hash = await encodeWorkspaceAbcHash(sourceText);
    await navigator.clipboard.writeText(`${origin}${pathname}#${hash}`);
    sourceStats.textContent = "Link copied";
  } catch (error) {
    console.error("[ABC Desk Web] Share link failed:", error);
    sourceStats.textContent = "Copy failed";
  }

  window.setTimeout(updateSourceStats, 1200);
}

export async function openWorkspaceAbcFile({
  file,
  importAbcButton,
  qualityPanel,
  renderCurrentInput,
  renderStatus,
  setInputValue,
}: OpenWorkspaceAbcFileOptions): Promise<void> {
  renderStatus.textContent = "Opening ABC...";
  importAbcButton.disabled = true;

  try {
    const abcText = await importAbcFile(file);
    setInputValue(abcText);
    renderCurrentInput();
    if (qualityPanel.hidden) renderStatus.textContent = "Opened ABC";
  } catch (error) {
    console.error("[ABC Desk Web] ABC import failed:", error);
    renderStatus.textContent = getAbcImportErrorMessage(error);
  } finally {
    importAbcButton.disabled = false;
  }
}

export async function importWorkspaceAbcFile(
  options: ImportWorkspaceAbcFileOptions,
): Promise<void> {
  const file = options.abcFileInput.files?.[0];
  if (!file) return;

  try {
    await openWorkspaceAbcFile({ ...options, file });
  } finally {
    // The same file picked twice in a row still has to fire a change.
    options.abcFileInput.value = "";
  }
}

export function exportWorkspaceAbcFile(
  sourceText: string,
  sourceStats: HTMLElement,
  updateSourceStats: () => void,
): void {
  if (!sourceText.trim()) return;

  downloadAbcSource(sourceText, getAbcSourceDownloadFilename(sourceText));
  sourceStats.textContent = "Saved ABC";
  window.setTimeout(updateSourceStats, 1200);
}

export function getAbcImportErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "ABC import failed";
}
