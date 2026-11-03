export const STUDIO_ABC_HASH_PREFIX = "abc=";

export function encodeStudioAbcHash(abcText: string): string {
  return `${STUDIO_ABC_HASH_PREFIX}${encodeURIComponent(abcText)}`;
}

export function decodeStudioAbcHash(hash: string): string | null {
  const normalizedHash = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!normalizedHash.startsWith(STUDIO_ABC_HASH_PREFIX)) return null;

  return decodeURIComponent(
    normalizedHash.slice(STUDIO_ABC_HASH_PREFIX.length)
  );
}
