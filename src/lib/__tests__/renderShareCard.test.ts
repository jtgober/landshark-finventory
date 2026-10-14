import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { renderShareCard, type RenderInput } from "../renderShareCard";
import { cardSafeName, initialsOf, type CardRow } from "../shareCard";

// A real WebP file labelled as a JPEG: exactly what made the renderer throw "Invalid JPEG".
const WEBP_AS_JPEG =
  "data:image/jpeg;base64,UklGRlIAAABXRUJQVlA4IEYAAAAQBACdASpAAEAAPm02mEkkIyKhIggAgA2JaQB2APwAACDQri2IXGAUQAD+6zb///OJY6nd3Z///NgQM0PnpFa4mPUcAAAA";

const fontFile = readFileSync(new URL("../../../public/fonts/LiberationSans-Bold.ttf", import.meta.url));
const font = fontFile.buffer.slice(fontFile.byteOffset, fontFile.byteOffset + fontFile.byteLength) as ArrayBuffer;

const row = (rank: number, extra: Partial<CardRow> = {}): CardRow => ({
  rank,
  name: "Test P.",
  value: "10.0 mi",
  avatar: null,
  initials: "TP",
  ...extra,
});
const input = (rows: CardRow[], extra: Partial<RenderInput> = {}): RenderInput => ({
  title: "Top 5 Runners",
  subtitle: "This Month",
  rows,
  logo: null,
  font,
  siteHost: "example.app",
  ...extra,
});
const isPng = (buf: ArrayBuffer) => Buffer.from(buf).subarray(0, 8).toString("hex") === "89504e470d0a1a0a";

describe("cardSafeName", () => {
  it("keeps ordinary names, accents, and Cyrillic and Greek letters", () => {
    expect(cardSafeName("Corey A.")).toBe("Corey A.");
    expect(cardSafeName("José Müller Ñ.")).toBe("José Müller Ñ.");
    expect(cardSafeName("Борис Ж.")).toBe("Борис Ж.");
    expect(cardSafeName("Ελένη Κ.")).toBe("Ελένη Κ.");
    expect(cardSafeName("Mary-Jane O'Neil")).toBe("Mary-Jane O'Neil");
  });

  it("drops emoji and scripts the bundled font can't draw", () => {
    expect(cardSafeName("Rachel 🏃‍♀️ S.")).toBe("Rachel S.");
    expect(cardSafeName("Kay ❤️ T.")).toBe("Kay T.");
    expect(cardSafeName("山田 Taro")).toBe("Taro");
  });

  it("falls back to Club Member when nothing is left", () => {
    expect(cardSafeName("🏃🏃")).toBe("Club Member");
    expect(cardSafeName("")).toBe("Club Member");
    expect(cardSafeName("   ")).toBe("Club Member");
  });

  it("makes initials from what is left", () => {
    expect(initialsOf("Corey A.")).toBe("CA");
    expect(initialsOf("Cher")).toBe("CH");
    expect(initialsOf("")).toBe("?");
  });
});

describe("renderShareCard", () => {
  it("draws a full PNG", async () => {
    const result = await renderShareCard(input([row(1), row(2), row(3), row(4), row(5)]));
    expect(result.degraded).toBeNull();
    expect(isPng(result.png)).toBe(true);
    expect(result.png.byteLength).toBeGreaterThan(5000);
  });

  it("draws with a single member", async () => {
    const result = await renderShareCard(input([row(1)]));
    expect(isPng(result.png)).toBe(true);
  });

  it("still produces the card, without photos, when a photo breaks the renderer", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await renderShareCard(input([row(1, { avatar: WEBP_AS_JPEG }), row(2)]));
    expect(result.degraded).toBe("no-photos");
    expect(isPng(result.png)).toBe(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("draws without the custom font or logo", async () => {
    const result = await renderShareCard(input([row(1), row(2)], { font: null, logo: null }));
    expect(isPng(result.png)).toBe(true);
  });
});
