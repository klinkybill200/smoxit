import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { hydrateAuthStorage } from "./integrations/supabase/persistentStorage";

// Hydrate the auth session from IndexedDB into localStorage before the app
// boots. This makes the Supabase client pick up sessions that survived even
// when localStorage was cleared (e.g. by iOS Safari ITP after 7 days).
hydrateAuthStorage().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
