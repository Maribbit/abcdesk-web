/**
 * The About sheet's last line: which desk this is. Two halves, because a page
 * nobody installs is never one release and one file — two readers on `v1.0.0`
 * can be running different code, so the commit is the half that tells them
 * apart, and it links to that tree on GitHub for anyone who wants to see what
 * they are running.
 *
 * Neither half is written in the markup: the build reads `package.json` and the
 * commit (`src/build/stamp.ts`) and Vite burns the values into this bundle, so
 * a page cannot claim a release it was not built from. A dev server, or a copy
 * of the source without a repository, has no commit to name and says `dev`.
 */
export const REPOSITORY_URL = "https://github.com/Maribbit/abcdesk-web";

export interface BuildStamp {
  version: string;
  commit: string;
  date: string;
}

/** This bundle's own name, as the build wrote it. */
export const BUILD_STAMP: BuildStamp = {
  version: __APP_VERSION__,
  commit: __BUILD_COMMIT__,
  date: __BUILD_DATE__,
};

const COMMIT = /^[0-9a-f]{7,40}$/i;
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** `v1.0.0 · 4f2a1c3`; `v1.0.0 · dev` when there is no commit to name. */
export function formatBuildStamp(stamp: BuildStamp): string {
  return `v${stamp.version} · ${stamp.commit}`;
}

/** The commit's own page, or nothing when the build has no commit to point at. */
export function buildCommitUrl(stamp: BuildStamp): string | null {
  return COMMIT.test(stamp.commit)
    ? `${REPOSITORY_URL}/commit/${stamp.commit}`
    : null;
}

/**
 * `2026-11-16` as `16 Nov 2026`: the day belongs in a tooltip a reader may not
 * hover and in a title a screen reader does read, and both want a day spelled
 * the way a person writes one rather than a filename's order.
 */
export function formatBuildDay(date: string): string | null {
  const match = ISO_DAY.exec(date);
  if (!match) return null;
  const [, year, month, day] = match;
  const name = MONTHS[Number(month) - 1];
  const number = Number(day);
  if (name === undefined || number < 1 || number > 31) return null;
  return `${number} ${name} ${year}`;
}

/**
 * Fills the footer's version slot. The slot is empty in the markup — a sheet
 * that ships without script has nothing to claim — and this is what puts the
 * build's name in it. A build with a commit links it; one without shows the
 * same words as plain text rather than a link that goes nowhere.
 */
export function renderBuildStamp(
  container: HTMLElement,
  stamp: BuildStamp,
): void {
  const label = formatBuildStamp(stamp);
  const url = buildCommitUrl(stamp);
  const day = formatBuildDay(stamp.date);
  // A page running from a dev server is not a build, so it takes no build date
  // and no link: there is nothing it could honestly point at.
  const title = url === null || day === null ? null : `Built ${day}`;
  const document = container.ownerDocument;
  const target =
    url === null ? document.createElement("span") : document.createElement("a");

  target.textContent = label;
  if (url !== null) {
    const link = target as HTMLAnchorElement;
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
  if (title !== null) target.title = title;

  container.replaceChildren(target);
}
