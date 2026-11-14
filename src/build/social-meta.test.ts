import { describe, expect, it } from "vitest";
import { absolutizeSocialMeta } from "./social-meta";

const HTML = [
  "<head>",
  '  <meta property="og:image" content="/social-card.png">',
  '  <meta name="twitter:image" content="/social-card.png">',
  "</head>",
].join("\n");

describe("absolutizeSocialMeta", () => {
  it("gives the card and the page their deployed addresses", () => {
    const html = absolutizeSocialMeta(HTML, "https://example.com");

    expect(html).toContain('content="https://example.com/social-card.png"');
    expect(html).toContain('<link rel="canonical" href="https://example.com/">');
    expect(html).toContain(
      '<meta property="og:url" content="https://example.com/">',
    );
  });

  it("keeps a subpath deployment inside its own folder", () => {
    const html = absolutizeSocialMeta(HTML, "https://example.com/workspace/");

    expect(html).toContain(
      'content="https://example.com/workspace/social-card.png"',
    );
    expect(html).toContain(
      '<link rel="canonical" href="https://example.com/workspace/">',
    );
    expect(html).not.toContain("workspace/workspace");
    expect(html).not.toContain('content="/social-card.png"');
  });
});
