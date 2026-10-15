import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import {
  CARD_FONT,
  CARD_HEIGHT,
  CARD_WIDTH,
  CombinedCard,
  Top5Card,
  type CardRow,
  type CombinedSection,
} from "./shareCard";

export interface RenderInput {
  title: string;
  subtitle: string;
  rows: CardRow[];
  logo: string | null;
  font: ArrayBuffer | null;
  siteHost: string;
}

export interface RenderedCard {
  png: ArrayBuffer;
  /** Which simpler version had to be used, or null when the full card rendered. */
  degraded: "no-photos" | "plain" | null;
}

async function draw(element: ReactElement, font: ArrayBuffer | null): Promise<ArrayBuffer> {
  const response = new ImageResponse(element, {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    fonts: font ? [{ name: CARD_FONT, data: font, weight: 700, style: "normal" }] : undefined,
  });
  // Rendering is lazy: errors only surface when the body is read, so read it here where we can catch them.
  const png = await response.arrayBuffer();
  if (png.byteLength === 0) throw new Error("renderer returned an empty image");
  return png;
}

function drawOnce(input: RenderInput): Promise<ArrayBuffer> {
  return draw(
    <Top5Card
      title={input.title}
      subtitle={input.subtitle}
      rows={input.rows}
      logo={input.logo}
      siteHost={input.siteHost}
    />,
    input.font,
  );
}

/**
 * Draws the card, falling back to simpler versions so one bad ingredient (a broken profile photo, a missing
 * font or logo) costs a feature of the card instead of the whole image. Throws only if even the plainest
 * version fails.
 */
export async function renderShareCard(input: RenderInput): Promise<RenderedCard> {
  const noPhotos: RenderInput = { ...input, rows: input.rows.map((r) => ({ ...r, avatar: null })) };
  const plain: RenderInput = { ...noPhotos, logo: null, font: null };
  const attempts: [RenderedCard["degraded"], RenderInput][] = [
    [null, input],
    ["no-photos", noPhotos],
    ["plain", plain],
  ];
  let lastError: unknown;
  for (const [degraded, attempt] of attempts) {
    try {
      return { png: await drawOnce(attempt), degraded };
    } catch (error) {
      lastError = error;
      console.error(`Share card render failed (${degraded ?? "full"} version)`, error);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export interface CombinedRenderInput {
  title: string;
  subtitle: string;
  sections: CombinedSection[];
  logo: string | null;
  font: ArrayBuffer | null;
  siteHost: string;
}

/** The all-disciplines card, with a plain fallback (no logo, built-in font) if the full version fails. */
export async function renderCombinedCard(
  input: CombinedRenderInput,
): Promise<{ png: ArrayBuffer; degraded: "plain" | null }> {
  const attempts: ["plain" | null, CombinedRenderInput][] = [
    [null, input],
    ["plain", { ...input, logo: null, font: null }],
  ];
  let lastError: unknown;
  for (const [degraded, attempt] of attempts) {
    try {
      const png = await draw(
        <CombinedCard
          title={attempt.title}
          subtitle={attempt.subtitle}
          sections={attempt.sections}
          logo={attempt.logo}
          siteHost={attempt.siteHost}
        />,
        attempt.font,
      );
      return { png, degraded };
    } catch (error) {
      lastError = error;
      console.error(`Combined share card render failed (${degraded ?? "full"} version)`, error);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
