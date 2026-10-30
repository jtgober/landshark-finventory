import { describe, expect, it } from "vitest";
import { siteSharePayload } from "../shareSite";

describe("siteSharePayload", () => {
  it("is only the link, so pasting gives just the address", () => {
    const payload = siteSharePayload("https://landshark-finventory.vercel.app/");
    expect(payload).toEqual({ url: "https://landshark-finventory.vercel.app/" });
    expect(Object.keys(payload)).toEqual(["url"]);
  });
});
