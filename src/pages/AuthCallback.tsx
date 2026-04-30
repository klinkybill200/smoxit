import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SmoxitLogo } from "@/components/SmoxitLogo";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    // Listen for auth state changes — most reliable way to detect login
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !cancelled) {
        navigate("/", { replace: true });
      }
    });

    const check = async () => {
      if (cancelled) return;
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate("/", { replace: true });
        return;
      }
      attempts++;
      if (attempts > 20) {
        // ~5s elapsed, something is wrong
        setError(
          "We couldn't sign you in. The link may have expired or already been used. Please request a new one.",
        );
        return;
      }
      setTimeout(check, 250);
    };
    check();

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
