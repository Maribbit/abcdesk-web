import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearLocalData, wireClearDataButton } from "./local-data";

const DRAFT_KEY = "abcdeskWorkspaceAbcText";
const SPLIT_KEY = "abcdeskWorkspaceDesktopSplit";
const THEME_KEY = "themeMode";
const ARMED_LABEL = "Press again to clear";

function mountButton(): {
  button: HTMLButtonElement;
  status: HTMLParagraphElement;
} {
  const button = document.createElement("button");
  button.textContent = "Clear local data";
  const status = document.createElement("p");
  return { button, status };
}

function storeSomebodyElse(): void {
  window.localStorage.setItem("someoneElse", "kept");
}

describe("Local data", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  describe("clearLocalData", () => {
    it("takes back the draft, the split and every setting", () => {
      window.localStorage.setItem(DRAFT_KEY, "X: 1\nT: Mine");
      window.localStorage.setItem(SPLIT_KEY, "420px");
      window.localStorage.setItem(THEME_KEY, "dark");
      window.localStorage.setItem("abcAutoCheck", "disabled");

      expect(clearLocalData(window.localStorage)).toEqual([
        DRAFT_KEY,
        SPLIT_KEY,
        THEME_KEY,
        "abcAutoCheck",
      ]);
      expect(window.localStorage.length).toBe(0);
    });

    it("leaves what belongs to another page on the same origin", () => {
      storeSomebodyElse();
      window.localStorage.setItem(DRAFT_KEY, "X: 1");

      clearLocalData(window.localStorage);

      expect(window.localStorage.getItem("someoneElse")).toBe("kept");
    });

    it("reports nothing when there was nothing to take", () => {
      expect(clearLocalData(window.localStorage)).toEqual([]);
    });
  });

  describe("the clear button", () => {
    it("asks before it takes anything", () => {
      window.localStorage.setItem(DRAFT_KEY, "X: 1");
      const { button, status } = mountButton();
      const restart = vi.fn();
      wireClearDataButton({
        button,
        status,
        storage: window.localStorage,
        restart,
      });

      button.click();

      // The words change and nothing else does.
      expect(button.textContent).toBe(ARMED_LABEL);
      expect(button.dataset.armed).toBe("true");
      expect(status.textContent).toBe(
        "The draft, the pane sizes and every setting go with it.",
      );
      expect(window.localStorage.getItem(DRAFT_KEY)).toBe("X: 1");
      expect(restart).not.toHaveBeenCalled();
    });

    it("clears on the second press, then hands the page back", () => {
      window.localStorage.setItem(DRAFT_KEY, "X: 1");
      window.localStorage.setItem(THEME_KEY, "dark");
      const { button, status } = mountButton();
      const restart = vi.fn();
      wireClearDataButton({
        button,
        status,
        storage: window.localStorage,
        restart,
      });

      button.click();
      button.click();

      expect(window.localStorage.length).toBe(0);
      expect(status.textContent).toBe("Cleared. The desk is starting over.");
      // Its work is done: the page is leaving, and a second clear would clear
      // nothing.
      expect(button.disabled).toBe(true);
      expect(button.textContent).toBe("Clear local data");
      expect(restart).not.toHaveBeenCalled();

      // Long enough to read the sentence, then the page goes.
      vi.advanceTimersByTime(700);
      expect(restart).toHaveBeenCalledTimes(1);
    });

    it("puts the question away when it is left alone", () => {
      window.localStorage.setItem(DRAFT_KEY, "X: 1");
      const { button, status } = mountButton();
      const restart = vi.fn();
      wireClearDataButton({
        button,
        status,
        storage: window.localStorage,
        restart,
      });

      button.click();
      vi.advanceTimersByTime(6000);

      expect(button.textContent).toBe("Clear local data");
      expect(button.dataset.armed).toBeUndefined();
      expect(status.textContent).toBe("");

      // A click now only asks again.
      button.click();
      expect(window.localStorage.getItem(DRAFT_KEY)).toBe("X: 1");
      expect(button.textContent).toBe(ARMED_LABEL);
      expect(restart).not.toHaveBeenCalled();
    });

    it("says so when there was nothing to clear", () => {
      const { button, status } = mountButton();
      const restart = vi.fn();
      wireClearDataButton({
        button,
        status,
        storage: window.localStorage,
        restart,
      });

      button.click();
      button.click();

      expect(status.textContent).toBe(
        "Nothing was stored. The desk is starting over.",
      );
      vi.advanceTimersByTime(700);
      expect(restart).toHaveBeenCalledTimes(1);
    });

    it("stops answering when it is taken down", () => {
      window.localStorage.setItem(DRAFT_KEY, "X: 1");
      const { button, status } = mountButton();
      const restart = vi.fn();
      const stop = wireClearDataButton({
        button,
        status,
        storage: window.localStorage,
        restart,
      });

      button.click();
      stop();
      button.click();

      expect(window.localStorage.getItem(DRAFT_KEY)).toBe("X: 1");
      vi.advanceTimersByTime(700);
      expect(restart).not.toHaveBeenCalled();
    });
  });
});
