import { awardXp } from "@/lib/xp";
import { toast } from "sonner";

export type ShareKind =
  | "money_saved"
  | "cigs_avoided"
  | "dream_goal"
  | "life_gained"
  | "streak"
  | "milestone"
  | "badge"
  | "level_up"
  | "generic";

export interface ShareIntent {
  kind: ShareKind;
  title: string;
  text: string;
  url?: string;
}

const APP_URL = "https://smoxit.app";

export const buildShareUrl = (intent: ShareIntent) => intent.url || APP_URL;

export const shareWhatsApp = (intent: ShareIntent) => {
  const msg = `${intent.text} ${buildShareUrl(intent)}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  trackShared(intent);
};

export const shareEmail = (intent: ShareIntent) => {
  const body = `${intent.text}\n\n${buildShareUrl(intent)}`;
  window.location.href = `mailto:?subject=${encodeURIComponent(intent.title)}&body=${encodeURIComponent(body)}`;
  trackShared(intent);
};

export const shareTwitter = (intent: ShareIntent) => {
  const msg = `${intent.text} ${buildShareUrl(intent)}`;
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`, "_blank");
  trackShared(intent);
};

export const shareTelegram = (intent: ShareIntent) => {
  window.open(
    `https://t.me/share/url?url=${encodeURIComponent(buildShareUrl(intent))}&text=${encodeURIComponent(intent.text)}`,
    "_blank",
  );
  trackShared(intent);
};

export const shareCopy = async (intent: ShareIntent) => {
  try {
    await navigator.clipboard.writeText(`${intent.text} ${buildShareUrl(intent)}`);
    toast.success("Copied to clipboard");
    trackShared(intent);
  } catch {
    toast.error("Couldn't copy");
  }
};

export const shareNative = async (intent: ShareIntent) => {
  if (!navigator.share) return false;
  try {
    await navigator.share({ title: intent.title, text: intent.text, url: buildShareUrl(intent) });
    trackShared(intent);
    return true;
  } catch {
    return false;
  }
};

const trackShared = (_intent: ShareIntent) => {
  void awardXp("share_milestone", { silent: true });
};
