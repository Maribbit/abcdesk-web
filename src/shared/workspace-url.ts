export const WORKSPACE_ABC_HASH_PREFIX = "abc=";

/**
 * Marks a deflated payload. A link written before sharing existed carries the
 * tune as percent-encoded text, and it still has to open, so the marker is what
 * tells the two apart — `encodeURIComponent` never emits a leading `z1.` in a
 * field line, which is the only thing an ABC file can start with.
 */
const COMPRESSED_MARKER = "z1.";

/**
 * A share link carries the whole tune, and a tune is text: deflate takes a
 * typical one to about a third of its percent-encoded length, which is the
 * difference between a link that survives a chat window and one that does not.
 *
 * Compression is a browser capability (`CompressionStream`), so the codec is
 * async and falls back to plain text where it is missing. A fallback link is
 * still a working link; it is only longer.
 */
export async function encodeWorkspaceAbcHash(
  abcText: string,
): Promise<string> {
  const compressed = await deflateText(abcText);
  if (compressed === null) {
    return `${WORKSPACE_ABC_HASH_PREFIX}${encodeURIComponent(abcText)}`;
  }
  return `${WORKSPACE_ABC_HASH_PREFIX}${COMPRESSED_MARKER}${toBase64Url(compressed)}`;
}

export async function decodeWorkspaceAbcHash(
  hash: string,
): Promise<string | null> {
  const normalizedHash = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!normalizedHash.startsWith(WORKSPACE_ABC_HASH_PREFIX)) return null;

  const payload = normalizedHash.slice(WORKSPACE_ABC_HASH_PREFIX.length);
  if (!payload.startsWith(COMPRESSED_MARKER)) {
    return decodeURIComponent(payload);
  }

  const bytes = fromBase64Url(payload.slice(COMPRESSED_MARKER.length));
  return bytes === null ? null : inflateText(bytes);
}

/**
 * The codecs are declared with a `BufferSource` writable side and a stream of
 * the same, while they only ever see bytes in and bytes out. One name for the
 * narrower pair keeps the pipe typed straight through.
 */
type ByteTransform = ReadableWritablePair<Uint8Array, Uint8Array>;

async function deflateText(text: string): Promise<Uint8Array | null> {
  if (typeof CompressionStream === "undefined") return null;

  const codec = new CompressionStream("deflate-raw") as unknown as ByteTransform;
  const out = byteStream(new TextEncoder().encode(text)).pipeThrough(codec);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

async function inflateText(bytes: Uint8Array): Promise<string | null> {
  if (typeof DecompressionStream === "undefined") return null;

  try {
    const codec = new DecompressionStream("deflate-raw") as unknown as ByteTransform;
    const out = byteStream(bytes).pipeThrough(codec);
    return await new Response(out).text();
  } catch {
    // A truncated or hand-edited link: nothing to open, but nothing to crash.
    return null;
  }
}

/** One chunk, one stream: the codec is the only thing that has to be native. */
function byteStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

/**
 * base64url rather than base64: `+`, `/` and `=` are all legal in a fragment,
 * but they are not legal in base64url's place in a URL, and every place a link
 * is pasted into — chat, mail, a paper — is allowed to mangle them.
 */
function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array | null {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  // The encoder strips padding; `atob` does not mind its absence, but a link
  // that arrives through a tool which adds it back is just as valid.
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}
