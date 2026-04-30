// Persistent storage adapter for Supabase auth.
// Uses IndexedDB (via idb-keyval) as the primary store because iOS Safari's
// Intelligent Tracking Prevention can wipe localStorage for web apps after
// ~7 days of inactivity, while IndexedDB is significantly more durable —
// especially for installed PWAs.
//
// We mirror writes to localStorage as a synchronous cache so that the
// Supabase client can read the session immediately on startup (it calls
// getItem synchronously-ish during init). On boot we hydrate IndexedDB →
// localStorage before the Supabase client is constructed.

import { get as idbGet, set as idbSet, del as idbDel, keys as idbKeys } from "idb-keyval";

const PREFIX = "sb-";

export const persistentStorage = {
  getItem: (key: string): string | null => {
    // Synchronous read from localStorage cache (kept in sync with IndexedDB).
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
    // Fire-and-forget mirror to IndexedDB for durability.
    void idbSet(key, value).catch(() => {});
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    void idbDel(key).catch(() => {});
  },
};

// Hydrate localStorage from IndexedDB on app boot.
// Must be awaited BEFORE the Supabase client is constructed.
export async function hydrateAuthStorage(): Promise<void> {
  try {
    const allKeys = await idbKeys();
    for (const k of allKeys) {
      if (typeof k !== "string") continue;
      // Only hydrate Supabase auth keys (they start with "sb-").
      if (!k.startsWith(PREFIX)) continue;
      try {
        // If localStorage already has a value, prefer that (it's the latest write).
        if (localStorage.getItem(k) !== null) continue;
        const val = await idbGet(k);
        if (typeof val === "string") {
          localStorage.setItem(k, val);
        }
      } catch {
        /* ignore individual key failures */
      }
    }
  } catch {
    /* IndexedDB unavailable — fall back to localStorage only */
  }
}
