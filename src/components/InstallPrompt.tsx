import { useEffect, useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const DISMISS_KEY = "smoxit:install-dismissed-at";
const DISMISS_DAYS = 7;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  const mql = window.matchMedia?.("(display-mode: standalone)").matches;
  // iOS Safari exposes navigator.standalone
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return Boolean(mql || iosStandalone);
}

function isInIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function getPlatform(): "ios" | "android" | "desktop" {
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function recentlyDismissed() {
  const ts = localStorage.getItem(DISMISS_KEY);
  if (!ts) return false;
  const ageDays = (Date.now() - Number(ts)) / (1000 * 60 * 60 * 24);
  return ageDays < DISMISS_DAYS;
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone() || isInIframe() || recentlyDismissed()) return;

    setPlatform(getPlatform());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS has no beforeinstallprompt — show banner after short delay
    if (getPlatform() === "ios") {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const handleInstall = async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") {
        setVisible(false);
      } else {
        dismiss();
      }
      setDeferred(null);
    } else {
      setShowHelp(true);
    }
  };

  if (!visible) return null;

  return (
    <>
      <div className="fixed left-3 right-3 bottom-20 z-40 animate-slide-up">
        <div className="smoxit-card flex items-center gap-3 shadow-elevated border-accent/30">
          <div className="h-10 w-10 rounded-xl bg-gradient-accent flex items-center justify-center shrink-0">
            <Download className="h-5 w-5 text-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground leading-tight">
              Install SMOXIT
            </p>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">
              Add to your home screen for the full app experience.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleInstall}
            className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold shrink-0"
          >
            Install
          </Button>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-md shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add SMOXIT to your home screen</DialogTitle>
            <DialogDescription>
              {platform === "ios"
                ? "Follow these steps in Safari:"
                : "Follow these steps in your browser:"}
            </DialogDescription>
          </DialogHeader>

          {platform === "ios" ? (
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="h-6 w-6 rounded-full bg-accent text-accent-foreground font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <span className="flex-1">
                  Tap the <Share className="inline h-4 w-4 mx-1" /> Share button at the bottom of Safari.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-6 w-6 rounded-full bg-accent text-accent-foreground font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <span className="flex-1">
                  Scroll down and tap <strong>Add to Home Screen</strong> <Plus className="inline h-4 w-4 mx-1" />.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-6 w-6 rounded-full bg-accent text-accent-foreground font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </span>
                <span className="flex-1">
                  Tap <strong>Add</strong> — done! Open SMOXIT from your home screen.
                </span>
              </li>
            </ol>
          ) : (
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="h-6 w-6 rounded-full bg-accent text-accent-foreground font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <span className="flex-1">
                  Open the browser menu (⋮ in the top-right).
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-6 w-6 rounded-full bg-accent text-accent-foreground font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <span className="flex-1">
                  Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-6 w-6 rounded-full bg-accent text-accent-foreground font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </span>
                <span className="flex-1">
                  Confirm — SMOXIT will launch like a native app.
                </span>
              </li>
            </ol>
          )}

          <Button onClick={() => setShowHelp(false)} className="w-full mt-2">
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
