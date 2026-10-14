import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAvatarDataUrl, sniffImageType } from "../avatarFetch";

const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16]);
const GIF = new Uint8Array([...new TextEncoder().encode("GIF89a"), 1, 0]);
const WEBP = new Uint8Array([...new TextEncoder().encode("RIFF"), 0, 0, 0, 0, ...new TextEncoder().encode("WEBP")]);

function respond(body: Uint8Array | string, init: { status?: number; type?: string } = {}) {
  return new Response(body as BodyInit, {
    status: init.status ?? 200,
    headers: { "content-type": init.type ?? "image/png" },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("fetchAvatarDataUrl", () => {
  it("returns a data URL for a normal image", async () => {
    const fetchMock = vi.fn(async () => respond(PNG));
    vi.stubGlobal("fetch", fetchMock);
    const url = await fetchAvatarDataUrl("https://example.com/a.png");
    expect(url).toBe(`data:image/png;base64,${Buffer.from(PNG).toString("base64")}`);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("trusts the file's own bytes over the Content-Type header", async () => {
    vi.stubGlobal("fetch", async () => respond(PNG, { type: "image/jpeg" }));
    expect(await fetchAvatarDataUrl("https://example.com/a.jpg")).toMatch(/^data:image\/png;base64,/);
    vi.stubGlobal("fetch", async () => respond(JPEG, { type: "application/octet-stream" }));
    expect(await fetchAvatarDataUrl("https://example.com/a")).toMatch(/^data:image\/jpeg;base64,/);
    vi.stubGlobal("fetch", async () => respond(GIF, { type: "text/plain" }));
    expect(await fetchAvatarDataUrl("https://example.com/a")).toMatch(/^data:image\/gif;base64,/);
  });

  it("never fetches an unsafe URL", async () => {
    const fetchMock = vi.fn(async () => respond(PNG));
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchAvatarDataUrl("http://example.com/a.png")).toBeNull();
    expect(await fetchAvatarDataUrl("https://127.0.0.1/a.png")).toBeNull();
    expect(await fetchAvatarDataUrl(null)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to null on errors, odd types, empty and oversized bodies, and network failures", async () => {
    vi.stubGlobal("fetch", async () => respond("nope", { status: 404 }));
    expect(await fetchAvatarDataUrl("https://example.com/a.png")).toBeNull();

    vi.stubGlobal("fetch", async () => respond("<svg/>", { type: "image/svg+xml" }));
    expect(await fetchAvatarDataUrl("https://example.com/a.svg")).toBeNull();

    vi.stubGlobal("fetch", async () => respond("<html>", { type: "text/html" }));
    expect(await fetchAvatarDataUrl("https://example.com/a.png")).toBeNull();

    // WebP is not drawable by the renderer, even when the server labels it as a JPEG.
    vi.stubGlobal("fetch", async () => respond(WEBP, { type: "image/jpeg" }));
    expect(await fetchAvatarDataUrl("https://example.com/a.jpg")).toBeNull();

    vi.stubGlobal("fetch", async () => respond(new Uint8Array(0)));
    expect(await fetchAvatarDataUrl("https://example.com/a.png")).toBeNull();

    vi.stubGlobal("fetch", async () => respond(new Uint8Array([...PNG, ...new Uint8Array(1_000_001)])));
    expect(await fetchAvatarDataUrl("https://example.com/a.png")).toBeNull();

    vi.stubGlobal("fetch", async () => {
      throw new TypeError("network down");
    });
    expect(await fetchAvatarDataUrl("https://example.com/a.png")).toBeNull();
  });

  it("does not follow redirects", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => respond(PNG));
    vi.stubGlobal("fetch", fetchMock);
    await fetchAvatarDataUrl("https://example.com/a.png");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: "error" });
  });
});

describe("sniffImageType", () => {
  it("recognises png, jpeg and gif by their first bytes", () => {
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(JPEG)).toBe("image/jpeg");
    expect(sniffImageType(GIF)).toBe("image/gif");
  });

  it("rejects everything else", () => {
    expect(sniffImageType(WEBP)).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(sniffImageType(new Uint8Array([]))).toBeNull();
    expect(sniffImageType(new Uint8Array([0x89, 0x50]))).toBeNull();
  });
});
