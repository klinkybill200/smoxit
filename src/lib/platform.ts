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

/** Open the external subscription page. On native uses in-app browser, on web opens a new tab. */
export const openSubscribePage = async () => {
  if (!isNative()) {
    window.open(SUBSCRIBE_URL, "_blank", "noopener,noreferrer");
    return;
  }

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

  let url = STRIPE_URL_DEFAULT;
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    if (data.continent_code === "EU") {
      url = STRIPE_URL_EU;
    }
  } catch {
    // fallback to default (non-EU) URL
  }

  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url });
  } catch (err) {
    console.error("Failed to open in-app browser:", err);
    window.open(url, "_blank");
  }
};
