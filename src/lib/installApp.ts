export type InstallPlatform = "ios" | "android" | "desktop";

/** Roughly which kind of device this is, for choosing the right "add to home screen" instructions. */
export function detectPlatform(userAgent: string, maxTouchPoints = 0): InstallPlatform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  // iPadOS 13+ reports itself as a Mac, but has a touch screen.
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
}

/** The steps to put the site on a home screen when the browser can't do it in one tap. */
export function manualInstallSteps(platform: InstallPlatform): string[] {
  switch (platform) {
    case "ios":
      return [
        "Open this site in Safari (not inside another app).",
        "Tap the Share button (the square with an arrow).",
        "Scroll down and tap Add to Home Screen, then Add.",
      ];
    case "android":
      return [
        "Open this site in Chrome.",
        "Tap the three dots menu at the top right.",
        "Tap Install app (or Add to Home screen), then Install.",
      ];
    case "desktop":
      return [
        "In Chrome or Edge, look for the install icon at the right end of the address bar.",
        "Or open the browser menu and choose Install Landshark (or Save and share, then Install page as app).",
      ];
  }
}
