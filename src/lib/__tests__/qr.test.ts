import { describe, expect, it } from "vitest";
import { qrMatrix, qrPath } from "../qr";

describe("qrMatrix", () => {
  it("makes a square grid whose size depends on the text", () => {
    const short = qrMatrix("https://a.co/");
    const long = qrMatrix("https://landshark-finventory.vercel.app/some/much/longer/path?with=query&and=more");
    expect(short.length).toBeGreaterThanOrEqual(21);
    expect(short.every((row) => row.length === short.length)).toBe(true);
    expect(long.length).toBeGreaterThan(short.length);
    // (size - 21) is a multiple of 4 for every QR version
    expect((short.length - 21) % 4).toBe(0);
  });

  it("has the three finder squares in the corners", () => {
    const m = qrMatrix("https://example.com/");
    const n = m.length;
    for (const [r, c] of [
      [0, 0],
      [0, n - 7],
      [n - 7, 0],
    ]) {
      // the 7x7 finder pattern: dark ring, light ring, dark 3x3 centre
      expect(m[r][c] && m[r][c + 6] && m[r + 6][c] && m[r + 6][c + 6]).toBe(true);
      expect(m[r + 1][c + 1]).toBe(false);
      expect(m[r + 3][c + 3]).toBe(true);
    }
  });

  it("is the same every time for the same text", () => {
    expect(qrMatrix("https://example.com/")).toEqual(qrMatrix("https://example.com/"));
  });
});

describe("qrPath", () => {
  it("merges runs of dark modules and offsets by the border", () => {
    const matrix = [
      [true, true, false, true],
      [false, false, false, false],
      [true, false, true, true],
    ];
    expect(qrPath(matrix, 2)).toBe("M2 2h2v1h-2zM5 2h1v1h-1zM2 4h1v1h-1zM4 4h2v1h-2z");
  });

  it("is empty for an all-light matrix and covers every dark module exactly once", () => {
    expect(qrPath([[false, false]], 1)).toBe("");
    const matrix = qrMatrix("https://example.com/");
    const darkCount = matrix.flat().filter(Boolean).length;
    const covered = [...qrPath(matrix, 0).matchAll(/h(\d+)v1/g)].reduce((sum, m) => sum + Number(m[1]), 0);
    expect(covered).toBe(darkCount);
  });
});
