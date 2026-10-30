import { qrMatrix, qrPath } from "@/lib/qr";

const QUIET_ZONE_MODULES = 4;

/** A QR code as a crisp SVG: dark modules on white with the quiet zone scanners need, whatever the page background. */
export default function QrCode({ text, size = 224, label }: { text: string; size?: number; label: string }) {
  const matrix = qrMatrix(text);
  const total = matrix.length + QUIET_ZONE_MODULES * 2;
  return (
    <svg
      viewBox={`0 0 ${total} ${total}`}
      width={size}
      height={size}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className="block max-w-full"
    >
      <rect width={total} height={total} fill="#ffffff" />
      <path d={qrPath(matrix, QUIET_ZONE_MODULES)} fill="#111827" />
    </svg>
  );
}
