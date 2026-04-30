import { useState } from "react";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SmoxitLogo } from "@/components/SmoxitLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AuthScreen = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      setSent(true);
      toast.success("Magic link sent! Check your inbox.");
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

        {!sent ? (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <div className="space-y-2 mb-6">
              <h2 className="text-2xl font-bold">Welcome 👋</h2>
              <p className="text-primary-foreground/70 text-sm">
                Enter your email — we'll recognize you if you've been here before, or get you started fresh.
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
                {loading ? "Sending..." : "Send Magic Link"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <p className="mt-auto pt-8 text-xs text-center text-primary-foreground/50">
              No password needed. Just one click in your inbox.
            </p>
          </form>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-accent/20 p-6 mb-6">
              <CheckCircle2 className="h-12 w-12 text-accent" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Check your inbox!</h2>
            <p className="text-primary-foreground/70 mb-8 max-w-xs">
              We sent a magic link to <strong className="text-primary-foreground">{email}</strong>.
              Click it to sign in.
            </p>
            <Button
              variant="ghost"
              onClick={() => { setSent(false); setEmail(""); }}
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
