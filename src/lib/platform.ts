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
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: SUBSCRIBE_URL });
  } else {
    window.open(SUBSCRIBE_URL, "_blank", "noopener,noreferrer");
  }
};
