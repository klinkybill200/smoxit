import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail, Twitter, Send, Copy, Share2 } from "lucide-react";
import {
  ShareIntent,
  shareWhatsApp,
  shareEmail,
  shareTwitter,
  shareTelegram,
  shareCopy,
  shareNative,
} from "@/lib/share";

interface Ctx {
  share: (intent: ShareIntent) => void;
}

const ShareCtx = createContext<Ctx | null>(null);

export const useShare = () => {
  const ctx = useContext(ShareCtx);
  if (!ctx) throw new Error("useShare outside provider");
  return ctx;
};

export const ShareProvider = ({ children }: { children: ReactNode }) => {
  const [intent, setIntent] = useState<ShareIntent | null>(null);

  const share = useCallback(async (i: ShareIntent) => {
    // Try native share sheet on mobile first; fall back to dialog
    if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
      const ok = await shareNative(i);
      if (ok) return;
    }
    setIntent(i);
  }, []);

  const close = () => setIntent(null);
  const wrap = (fn: (i: ShareIntent) => void) => () => {
    if (!intent) return;
    fn(intent);
    close();
  };

  return (
    <ShareCtx.Provider value={{ share }}>
      {children}
      <Dialog open={!!intent} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-accent" /> {intent?.title || "Share"}
            </DialogTitle>
            <DialogDescription className="text-left">{intent?.text}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" className="h-12" onClick={wrap(shareWhatsApp)}>
              <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
            </Button>
            <Button variant="secondary" className="h-12" onClick={wrap(shareEmail)}>
              <Mail className="mr-1 h-4 w-4" /> Email
            </Button>
            <Button variant="secondary" className="h-12" onClick={wrap(shareTwitter)}>
              <Twitter className="mr-1 h-4 w-4" /> Twitter / X
            </Button>
            <Button variant="secondary" className="h-12" onClick={wrap(shareTelegram)}>
              <Send className="mr-1 h-4 w-4" /> Telegram
            </Button>
            <Button variant="secondary" className="col-span-2 h-12" onClick={wrap(shareCopy)}>
              <Copy className="mr-1 h-4 w-4" /> Copy link
            </Button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">+10 XP for spreading the word 🚀</p>
        </DialogContent>
      </Dialog>
    </ShareCtx.Provider>
  );
};

/** Compact inline share trigger button (icon-only). */
export const ShareButton = ({
  intent,
  className = "",
  label = "Share",
}: {
  intent: ShareIntent;
  className?: string;
  label?: string;
}) => {
  const { share } = useShare();
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        share(intent);
      }}
      className={
        "inline-flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground " +
        className
      }
    >
      <Share2 className="h-3.5 w-3.5" />
    </button>
  );
};
