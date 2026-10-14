import { isSafeAvatarUrl } from "./avatarUrl";

const TIMEOUT_MS = 4000;
const MAX_BYTES = 1_000_000;
// Satori draws PNG, JPEG and GIF; anything else falls back to initials.
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif"]);

/**
 * A member's profile photo as a data: URL for the share card, or null on any problem
 * (unsafe URL, timeout, error status, odd type, too big) so the card shows initials instead.
 */
export async function fetchAvatarDataUrl(raw: string | null | undefined): Promise<string | null> {
  if (!isSafeAvatarUrl(raw)) return null;
  try {
    const res = await fetch(raw, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "error" });
    const type = res.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
    if (!res.ok || !ALLOWED_TYPES.has(type)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_BYTES) return null;
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}
