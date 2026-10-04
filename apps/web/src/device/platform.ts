/** Whether the app was opened from the Home Screen or as an installed app, not in a browser tab. */
export function isInstalled(): boolean {
  const isIosStandalone = "standalone" in navigator && navigator.standalone === true;
  return isIosStandalone || matchMedia("(display-mode: standalone)").matches;
}

/** Whether this is a browser on iPhone or iPad, where every browser runs Safari's engine. */
export function isIos(): boolean {
  // iPadOS reports itself as a Mac; touch support gives it away.
  const isIpad = navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || isIpad;
}
