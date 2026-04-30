import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SmoxitLogo } from "@/components/SmoxitLogo";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const goHome = () => {
      if (!cancelled) navigate("/", { replace: true });
    };

    // Listen for auth state changes — fires as soon as a session is established
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) goHome();
    });

    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const hash = window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : window.location.hash;
        const hashParams = new URLSearchParams(hash);
        const queryParams = url.searchParams;

        // 1. Surface explicit errors from the provider
        const errDesc =
          queryParams.get("error_description") ||
          hashParams.get("error_description") ||
          queryParams.get("error") ||
          hashParams.get("error");
        if (errDesc) {
          setError(decodeURIComponent(errDesc.replace(/\+/g, " ")));
          return;
        }

        // 2. PKCE / OAuth code flow → exchange code for session
        const code = queryParams.get("code");
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(
            window.location.href,
          );
          if (exErr) {
            setError(exErr.message);
            return;
          }
          // Clean URL
          window.history.replaceState({}, "", url.pathname);
          goHome();
          return;
        }

        // 3. Implicit / magic-link flow → tokens are in the hash
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error: setErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setErr) {
            setError(setErr.message);
            return;
          }
          window.history.replaceState({}, "", url.pathname);
          goHome();
          return;
        }

        // 4. Legacy email-link flow → token_hash + type
        const tokenHash = queryParams.get("token_hash") || hashParams.get("token_hash");
        const type = (queryParams.get("type") || hashParams.get("type")) as
          | "signup"
          | "magiclink"
          | "recovery"
          | "invite"
          | "email_change"
          | "email"
          | null;
        if (tokenHash && type) {
          const { error: vErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type === "email" ? "email" : type,
          } as never);
          if (vErr) {
            setError(vErr.message);
            return;
          }
          window.history.replaceState({}, "", url.pathname);
          goHome();
          return;
        }

        // 5. Nothing actionable → maybe session already exists
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          goHome();
          return;
        }

        setError(
          "We couldn't sign you in. The link may have expired or already been used. Please request a new one.",
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unexpected error during sign-in.";
        setError(msg);
      }
    };

    run();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-hero text-primary-foreground flex flex-col items-center justify-center px-6 text-center">
      <SmoxitLogo size={64} variant="light" />
      {error ? (
        <>
          <p className="mt-6 text-primary-foreground/80 max-w-xs">{error}</p>
          <button
            onClick={() => navigate("/", { replace: true })}
            className="mt-6 rounded-full bg-accent text-accent-foreground px-6 py-3 font-bold"
          >
            Back to sign in
          </button>
        </>
      ) : (
        <p className="mt-6 text-primary-foreground/70 animate-pulse">Signing you in...</p>
      )}
    </div>
  );
};

export default AuthCallback;
