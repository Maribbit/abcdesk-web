export const WORKSPACE_ABC_HASH_PREFIX = "abc=";

export function encodeWorkspaceAbcHash(abcText: string): string {
  return `${WORKSPACE_ABC_HASH_PREFIX}${encodeURIComponent(abcText)}`;
}

export function decodeWorkspaceAbcHash(hash: string): string | null {
  const normalizedHash = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!normalizedHash.startsWith(WORKSPACE_ABC_HASH_PREFIX)) return null;

  return decodeURIComponent(
    normalizedHash.slice(WORKSPACE_ABC_HASH_PREFIX.length)
  );
}
