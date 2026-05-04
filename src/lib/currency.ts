import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Currency = "eur" | "usd";

export interface CurrencyMeta {
  code: Currency;
  symbol: string;
  /** Display label e.g. "EUR (€)" */
  label: string;
  /** Subscription price displayed in this currency */
  priceLabel: string;
  /** Numeric subscription price */
  priceAmount: number;
  /** Referral credit per converted friend */
  referralCreditAmount: number;
  /** Locale used for Intl formatting */
  locale: string;
}

export const CURRENCIES: Record<Currency, CurrencyMeta> = {
  eur: {
    code: "eur",
    symbol: "€",
    label: "EUR (€)",
    priceLabel: "€9.95",
    priceAmount: 9.95,
    referralCreditAmount: 5,
    locale: "de-DE",
  },
  usd: {
    code: "usd",
    symbol: "$",
    label: "USD ($)",
    priceLabel: "$9.95",
    priceAmount: 9.95,
    referralCreditAmount: 5,
    locale: "en-US",
  },
};

// EU + EEA + CH locale prefixes that default to EUR
const EUR_LOCALES = new Set([
  "de", "fr", "it", "es", "pt", "nl", "el", "fi", "sv", "da", "pl",
  "cs", "sk", "hu", "ro", "bg", "hr", "sl", "et", "lv", "lt", "ga",
  "mt", "lb", "is", "no", "ca", "eu", "gl",
]);

export const detectCurrencyFromLocale = (): Currency => {
  if (typeof navigator === "undefined") return "usd";
  const langs = [navigator.language, ...(navigator.languages ?? [])];
  for (const l of langs) {
    if (!l) continue;
    const primary = l.toLowerCase().split("-")[0];
    if (EUR_LOCALES.has(primary)) return "eur";
    // Region-based: -de, -fr, -at, -ch (treat CH as EUR for our purposes)
    const region = l.toLowerCase().split("-")[1];
    if (region && ["at", "be", "ch", "de", "es", "fi", "fr", "gr", "ie", "it", "lu", "nl", "pt"].includes(region)) {
      return "eur";
    }
  }
  return "usd";
};

const STORAGE_KEY = "smoxit:currency";

let currentCurrency: Currency = (() => {
  if (typeof localStorage === "undefined") return "usd";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "eur" || stored === "usd") return stored;
  return detectCurrencyFromLocale();
})();

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getSnapshot = () => currentCurrency;

export const setCurrency = async (next: Currency, persistRemote = true) => {
  if (next === currentCurrency) return;
  currentCurrency = next;
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  listeners.forEach((cb) => cb());
  if (persistRemote) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ preferred_currency: next }).eq("user_id", user.id);
      }
    } catch (e) {
      console.warn("Could not persist currency to profile", e);
    }
  }
};

export const getCurrency = (): Currency => currentCurrency;

export const formatCurrency = (n: number, code: Currency = currentCurrency): string => {
  const meta = CURRENCIES[code];
  return `${meta.symbol}${n.toFixed(2)}`;
};

/**
 * Hook: returns the active currency meta. Re-renders on change.
 * On first mount, syncs with `profiles.preferred_currency` if set;
 * otherwise persists the locale-detected currency to the profile.
 */
export const useCurrency = () => {
  const code = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data } = await supabase
          .from("profiles")
          .select("preferred_currency")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        const remote = data?.preferred_currency as Currency | null | undefined;
        if (remote === "eur" || remote === "usd") {
          if (remote !== currentCurrency) {
            currentCurrency = remote;
            try { localStorage.setItem(STORAGE_KEY, remote); } catch { /* */ }
            listeners.forEach((cb) => cb());
          }
        } else {
          // No remote pref yet → push local detected value up
          await supabase.from("profiles").update({ preferred_currency: currentCurrency }).eq("user_id", user.id);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const meta = CURRENCIES[code];
  return {
    ...meta,
    setCurrency: (next: Currency) => setCurrency(next),
    format: (n: number) => formatCurrency(n, code),
  };
};
