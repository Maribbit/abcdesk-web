import {
  ABC_AUTO_CHECK_STORAGE_KEY,
  EDITOR_WRAP_STORAGE_KEY,
  KEYBOARD_VISIBILITY_STORAGE_KEY,
  LAYOUT_MODE_STORAGE_KEY,
  THEME_MODE_STORAGE_KEY,
} from "../shared/settings";

/** The draft itself: the sheet's text, written back on every edit. */
export const WORKSPACE_SOURCE_STORAGE_KEY = "abcdeskWorkspaceAbcText";
export const WORKSPACE_DESKTOP_SPLIT_STORAGE_KEY = "abcdeskWorkspaceDesktopSplit";
export const WORKSPACE_MOBILE_SPLIT_STORAGE_KEY = "abcdeskWorkspaceMobileSplit";

/**
 * What the desk leaves in this browser, one key at a time.
 *
 * A list rather than a prefix, because the settings keys are the suite's and
 * carry no prefix; and the whole list, because a key the clear button does not
 * know about is a setting a reader cannot get back. Clearing the storage
 * wholesale is not the alternative it looks like: on a shared origin it would
 * take every other page's data with it.
 */
const LOCAL_DATA_KEYS = [
  WORKSPACE_SOURCE_STORAGE_KEY,
  WORKSPACE_DESKTOP_SPLIT_STORAGE_KEY,
  WORKSPACE_MOBILE_SPLIT_STORAGE_KEY,
  THEME_MODE_STORAGE_KEY,
  LAYOUT_MODE_STORAGE_KEY,
  KEYBOARD_VISIBILITY_STORAGE_KEY,
  ABC_AUTO_CHECK_STORAGE_KEY,
  EDITOR_WRAP_STORAGE_KEY,
] as const;

const ARM_TIMEOUT_MS = 6000;
const RESTART_DELAY_MS = 700;
const ARMED_LABEL = "Press again to clear";
const ARMED_STATUS = "The draft, the pane sizes and every setting go with it.";
const CLEARED_STATUS = "Cleared. The desk is starting over.";
const NOTHING_STORED_STATUS = "Nothing was stored. The desk is starting over.";

/**
 * Takes back every key the desk wrote, and says which ones it took: an empty
 * list is the honest answer for a reader who has not typed anything yet.
 */
export function clearLocalData(storage: Storage): string[] {
  const removed: string[] = [];

  for (const key of LOCAL_DATA_KEYS) {
    if (storage.getItem(key) === null) continue;
    storage.removeItem(key);
    removed.push(key);
  }

  return removed;
}

export interface ClearDataButtonOptions {
  button: HTMLButtonElement;
  status: HTMLElement;
  storage: Storage;
  /** Puts the page back on a first visit — after the address has been emptied too. */
  restart: () => void;
}

/**
 * One destructive button, pressed twice.
 *
 * The first press only asks: the label, the status and a data attribute change,
 * and nothing is deleted. The question expires on its own, because a button
 * left armed in an open sheet would clear the desk on a click nobody meant as
 * an answer. The second press clears, says what it did, and hands the page back
 * to `restart`.
 */
export function wireClearDataButton({
  button,
  status,
  storage,
  restart,
}: ClearDataButtonOptions): () => void {
  const restingLabel = button.textContent ?? "";
  let armed = false;
  let armTimer = 0;
  let restartTimer = 0;

  const disarm = (): void => {
    armed = false;
    window.clearTimeout(armTimer);
    armTimer = 0;
    delete button.dataset.armed;
    button.textContent = restingLabel;
    status.textContent = "";
  };

  const handleClick = (): void => {
    if (!armed) {
      armed = true;
      button.dataset.armed = "true";
      button.textContent = ARMED_LABEL;
      status.textContent = ARMED_STATUS;
      armTimer = window.setTimeout(disarm, ARM_TIMEOUT_MS);
      return;
    }

    window.clearTimeout(armTimer);
    armed = false;
    delete button.dataset.armed;
    button.textContent = restingLabel;
    // Done, and not a target again: the page is on its way out, and a second
    // clear would clear nothing.
    button.disabled = true;

    const removed = clearLocalData(storage);
    status.textContent =
      removed.length > 0 ? CLEARED_STATUS : NOTHING_STORED_STATUS;
    restartTimer = window.setTimeout(restart, RESTART_DELAY_MS);
  };

  button.addEventListener("click", handleClick);

  return () => {
    window.clearTimeout(armTimer);
    window.clearTimeout(restartTimer);
    button.removeEventListener("click", handleClick);
  };
}
