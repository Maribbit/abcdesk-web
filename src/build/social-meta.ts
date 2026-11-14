/**
 * Link previews want absolute addresses, and the build only learns the
 * deployment's address from `SITE_URL` — the address readers will open, e.g.
 * `https://example.com/workspace/`. Without it the tags keep the paths the page
 * itself uses: most readers resolve them, the strictest do not.
 *
 * The tune cannot travel in this card: it rides in the hash, which no crawler
 * reports, so the card names the workbench and the reader opens the score.
 */
export function absolutizeSocialMeta(html: string, siteUrl: string): string {
  const pageUrl = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
  const cardUrl = `${pageUrl}social-card.png`;

  return html
    .replace(/(content=")[^"]*social-card\.png"/g, `$1${cardUrl}"`)
    .replace(
      "</head>",
      `  <link rel="canonical" href="${pageUrl}">\n` +
        `  <meta property="og:url" content="${pageUrl}">\n` +
        "</head>",
    );
}
