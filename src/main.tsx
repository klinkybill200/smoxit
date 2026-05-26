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
      console.log("[RC] Plugin object:", Purchases);
      console.log("[RC] Available methods:", Object.keys(Purchases));
      // Small delay to ensure native bridge is ready
      await new Promise((resolve) => setTimeout(resolve, 500));
      await Purchases.configure({ apiKey: REVENUECAT_IOS_KEY });
      console.log("[RevenueCat] configured with key prefix:", REVENUECAT_IOS_KEY?.slice(0, 8));
    } catch (e) {
      console.error("[RevenueCat] configure failed", e);
    }
  }
  createRoot(document.getElementById("root")!).render(<App />);
});
