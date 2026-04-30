import { useState } from "react";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SmoxitLogo } from "@/components/SmoxitLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Random password — user never sees or needs it (we use magic links for return logins)
const generatePassword = () =>
  crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "").slice(0, 8) + "Aa1!";

export const AuthScreen = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    setLoading(true);
    try {
      // 1. Check if user already exists
      const { data: check, error: checkErr } = await supabase.functions.invoke(
        "check-user-exists",
        { body: { email: normalized } },
      );
      if (checkErr) throw checkErr;

      if (check?.exists) {
        // Returning user → send magic link
        const { error } = await supabase.auth.signInWithOtp({
          email: normalized,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            shouldCreateUser: false,
          },
        });
        if (error) throw error;
        setSentTo(normalized);
        toast.success("Welcome back! Magic link sent.");
      } else {
        // New user → sign up with random password & log in immediately
        const password = generatePassword();
        const { error: signUpErr } = await supabase.auth.signUp({
          email: normalized,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (signUpErr) throw signUpErr;
        // Auto-confirm is enabled, so we can sign in immediately
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: normalized,
          password,
        });
        if (signInErr) throw signInErr;
        toast.success("Let's get you set up!");
        // AuthProvider listener will pick up the session and Index will switch to Onboarding
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero text-primary-foreground flex flex-col">
      <div className="mx-auto w-full max-w-[430px] flex-1 flex flex-col px-6 py-12">
        <div className="flex flex-col items-center mb-12 mt-8">
          <SmoxitLogo size={64} variant="light" />
          <p className="mt-4 text-primary-foreground/70 text-center text-lg font-semibold">
            Quit Today. Win Forever.
          </p>
        </div>

        {!sentTo ? (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <div className="space-y-2 mb-6">
              <h2 className="text-2xl font-bold">Welcome 👋</h2>
              <p className="text-primary-foreground/70 text-sm">
                Enter your email — new users start right away, returning users get a magic link.
              </p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-foreground/50" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="pl-10 h-14 bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/40 text-base"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full h-14 text-base font-bold bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {loading ? "Just a sec..." : "Continue"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <p className="mt-auto pt-8 text-xs text-center text-primary-foreground/50">
              No password needed.
            </p>
          </form>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-accent/20 p-6 mb-6">
              <CheckCircle2 className="h-12 w-12 text-accent" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Check your inbox!</h2>
            <p className="text-primary-foreground/70 mb-8 max-w-xs">
              We sent a magic link to <strong className="text-primary-foreground">{sentTo}</strong>.
              Click it to sign in.
            </p>
            <Button
              variant="ghost"
              onClick={() => { setSentTo(null); setEmail(""); }}
              className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10"
            >
              Use a different email
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
