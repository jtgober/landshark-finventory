import { isSafeAvatarUrl } from "./avatarUrl";

const TIMEOUT_MS = 4000;
const MAX_BYTES = 1_000_000;

/**
 * The image type from the file's own first bytes, for the formats the card renderer can draw.
 * The server's Content-Type header isn't trusted: a mismatch ("image/jpeg" on WebP data) makes
 * the renderer throw and would break the whole card.
 */
export function sniffImageType(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/gif" | null {
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 6) {
    const head = String.fromCharCode(...bytes.slice(0, 6));
    if (head === "GIF87a" || head === "GIF89a") return "image/gif";
  }
  return null;
}

/**
 * A member's profile photo as a data: URL for the share card, or null on any problem
 * (unsafe URL, timeout, error status, unsupported or mislabeled file, too big) so the card shows initials.
 */
export async function fetchAvatarDataUrl(raw: string | null | undefined): Promise<string | null> {
  if (!isSafeAvatarUrl(raw)) return null;
  try {
    const res = await fetch(raw, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "error" });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_BYTES) return null;
    const type = sniffImageType(bytes);
    if (!type) return null;
    return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch {
    return null;
  }
}
