import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SmoxitLogo } from "@/components/SmoxitLogo";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase auto-parses the hash fragment and stores the session.
    // We just wait for the session, then redirect.
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate("/", { replace: true });
      } else {
        // give it a moment for the listener
        setTimeout(check, 250);
      }
    };
    check();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-hero text-primary-foreground flex flex-col items-center justify-center">
      <SmoxitLogo size={64} />
      <p className="mt-6 text-primary-foreground/70 animate-pulse">Signing you in...</p>
    </div>
  );
};

export default AuthCallback;
