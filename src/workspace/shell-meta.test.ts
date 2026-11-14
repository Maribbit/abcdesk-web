import { describe, expect, it } from "vitest";
import html from "./index.html?raw";

// The card is a public file, not an import: crawlers ask for it by name.
const cardFiles = Object.keys(import.meta.glob("../../public/social-card.png"));

describe("Workspace shell head", () => {
  it("points the link preview at a card that exists", () => {
    expect(cardFiles).toHaveLength(1);
    expect(html).toContain(
      '<meta property="og:image" content="%BASE_URL%social-card.png">',
    );
    // The size is declared so a crawler crops nothing.
    expect(html).toContain('<meta property="og:image:width" content="1200">');
    expect(html).toContain('<meta property="og:image:height" content="630">');
  });

  it("describes the workbench to a link preview", () => {
    expect(html).toContain('<meta name="description" content="A browser workbench');
    expect(html).toContain('<meta property="og:title" content="ABC Desk Web">');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
  });

  it("keeps a title for the tab before a tune is parsed", () => {
    expect(html).toContain("<title>ABC Desk Web</title>");
  });

  it("still answers when scripts are off", () => {
    expect(html).toContain("<noscript>");
    expect(html).toContain("need JavaScript");
  });
});
