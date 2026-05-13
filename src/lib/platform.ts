import { Capacitor } from "@capacitor/core";

export const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export const SUBSCRIBE_URL = "https://my.smoxit.app/subscribe";

/** Open the external subscription page. On native uses in-app browser, on web opens a new tab. */
export const openSubscribePage = async () => {
  if (isNative()) {
    // Show Apple-mandated external purchase disclaimer with native dialog
    const { Dialog } = await import("@capacitor/dialog");
    const { value } = await Dialog.confirm({
      title: "External Purchase",
      message:
        "You are about to leave the app to complete your purchase on smoxit.app. Apple is not responsible for the privacy or security of purchases made on external websites.",
      okButtonTitle: "Continue",
      cancelButtonTitle: "Cancel",
    });
    if (!value) return;

    try {
      const { Browser } = await import("@capacitor/browser");
      // Always use the full absolute URL so native context never resolves a relative path
      await Browser.open({ url: SUBSCRIBE_URL });
    } catch (err) {
      console.error("Failed to open in-app browser:", err);
      // Fallback: try system browser / new window
      window.open(SUBSCRIBE_URL, "_blank");
    }
  } else {
    window.open(SUBSCRIBE_URL, "_blank", "noopener,noreferrer");
  }
};
