/**
 * Extracts the domain (with protocol and trailing slash) from a complete URL.
 * @param url - The complete URL to extract the domain from
 * @returns The domain with protocol and trailing slash (e.g., "https://invite.base.app/")
 * @example
 * getDomain("https://invite.base.app/code/1234") // returns "https://invite.base.app/"
 */
export function getDomain(url: string): string {
  const parsed = new URL(url);
  return `${parsed.origin}/`;
}

export const getFaviconUrl = (url: string) => {
  return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${url}&size=128`;
};
