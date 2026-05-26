import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { hydrateAuthStorage } from "./integrations/supabase/persistentStorage";

hydrateAuthStorage().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
