import { encode } from "uqr";

/** The QR code for some text as rows of modules (true = dark). Medium error correction survives a smudge or glare. */
export function qrMatrix(text: string): boolean[][] {
  return encode(text, { ecc: "M", border: 0 }).data;
}

/**
 * SVG path data that draws every dark module of a matrix, offset by a quiet-zone border (in modules).
 * Horizontal runs of dark modules are merged into one rectangle each, which keeps the path short and
 * avoids hairline gaps between neighbouring squares.
 */
export function qrPath(matrix: boolean[][], border = 4): string {
  const parts: string[] = [];
  matrix.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x += 1;
        continue;
      }
      let end = x;
      while (end < row.length && row[end]) end += 1;
      parts.push(`M${x + border} ${y + border}h${end - x}v1h-${end - x}z`);
      x = end;
    }
  });
  return parts.join("");
}
