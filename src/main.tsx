import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";
import { hydrateAuthStorage } from "./integrations/supabase/persistentStorage";
import { REVENUECAT_IOS_KEY } from "./lib/iap";

hydrateAuthStorage().finally(async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Purchases } = await import("@revenuecat/purchases-capacitor");
      await Purchases.configure({ apiKey: REVENUECAT_IOS_KEY });
      console.log("[RevenueCat] configured");
    } catch (e) {
      console.error("[RevenueCat] configure failed", e);
    }
  }
  createRoot(document.getElementById("root")!).render(<App />);
});
