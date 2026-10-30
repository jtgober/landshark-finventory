/**
 * What the phone's share sheet gets for "Share site": just the link. Passing a `text` or `title` too makes
 * many apps paste a sentence in front of the address, and people want to paste only the link.
 */
export function siteSharePayload(url: string): { url: string } {
  return { url };
}
