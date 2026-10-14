/**
 * Whether a member's profile photo URL is safe to fetch from the server when drawing the share card.
 * The URL comes from their Strava profile: allow only ordinary public https hosts, never localhost,
 * internal names or IP addresses.
 */
export function isSafeAvatarUrl(raw: string | null | undefined): raw is string {
  if (!raw) return false;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) {
      return false;
    }
    if (/^[\d.]+$/.test(host) || host.includes(":")) return false;
    return host.includes(".");
  } catch {
    return false;
  }
}
