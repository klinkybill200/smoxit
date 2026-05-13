import { Capacitor } from "@capacitor/core";

export const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export const SUBSCRIBE_URL = "https://my.smoxit.app/subscribe";
const STRIPE_URL_EU = "https://buy.stripe.com/7sY8wPbjE8lE6KG1XjfnO01";
const STRIPE_URL_DEFAULT = "https://buy.stripe.com/00w5kD1J48lEd94fO9fnO00";

/**
 * Open the external subscription page.
 * On native: shows disclaimer, detects region, opens in-app browser, and
 * invokes onFinished when the user closes the browser.
 * On web: opens a new tab.
 */
export const openSubscribePage = async (onFinished?: () => boolean | Promise<boolean> | void) => {
  if (!isNative()) {
    window.open(SUBSCRIBE_URL, "_blank", "noopener,noreferrer");
    return;
  }

  // Apple-mandated external purchase disclaimer
  const { Dialog } = await import("@capacitor/dialog");
  const { value } = await Dialog.confirm({
    title: "External Purchase",
    message:
      "You are about to leave the app to complete your purchase on smoxit.app. Apple is not responsible for the privacy or security of purchases made on external websites.",
    okButtonTitle: "Continue",
    cancelButtonTitle: "Cancel",
  });
  if (!value) return;

  let url = STRIPE_URL_DEFAULT;
  try {
    const { Device } = await import("@capacitor/device");
    const info = await Device.getLanguageCode();
    const locale = info.value; // e.g. "de-DE", "en-US"
    const isEU =
      locale.includes("DE") || locale.includes("AT") || locale.includes("CH") ||
      locale.includes("FR") || locale.includes("IT") || locale.includes("ES") ||
      locale.includes("NL") || locale.includes("BE") || locale.includes("PT") ||
      locale.includes("PL") || locale.includes("SE") || locale.includes("NO") ||
      locale.includes("DK") || locale.includes("FI");
    if (isEU) url = STRIPE_URL_EU;
  } catch {
    // fallback to default URL
  }

  try {
    const { Browser } = await import("@capacitor/browser");

    // Listen for browser close to re-check subscription
    const handle = await Browser.addListener("browserFinished", () => {
      void handle.remove();
      if (!onFinished) return;

      const delays = [2000, 4000, 6000, 10000, 15000];
      let attempt = 0;

      const scheduleNext = () => {
        if (attempt >= delays.length) return;
        const delay = delays[attempt];
        attempt++;
        setTimeout(async () => {
          try {
            const shouldStop = await onFinished();
            if (shouldStop) return;
          } catch (e) {
            console.error("Subscription check failed:", e);
          }
          scheduleNext();
        }, delay);
      };

      scheduleNext();
    });

    await Browser.open({ url });
  } catch (err) {
    console.error("Failed to open in-app browser:", err);
    window.open(url, "_blank");
  }
};
