import { useState } from "react";
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { SmoxitLogo } from "@/components/SmoxitLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AuthScreen = () => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setEmail(normalized);
      setSent(true);
      setCode("");
      toast.success("We sent an 8-digit code to your inbox.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (token: string) => {
    setVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) throw error;
      toast.success("Signed in!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid or expired code.";
      toast.error(msg);
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  const onCodeChange = (value: string) => {
    setCode(value);
    if (value.length === 8 && !verifying) {
      void handleVerify(value);
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
          <form onSubmit={handleSendCode} className="flex-1 flex flex-col">
            <div className="space-y-2 mb-6">
              <h2 className="text-2xl font-bold">Welcome 👋</h2>
              <p className="text-primary-foreground/70 text-sm">
                Enter your email — we'll send you a 6-digit code to sign in.
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
                {loading ? "Sending code..." : "Send code"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <p className="mt-auto pt-8 text-xs text-center text-primary-foreground/50">
              No password needed.
            </p>
          </form>
        ) : (
          <div className="flex-1 flex flex-col">
            <button
              type="button"
              onClick={() => { setSent(false); setCode(""); }}
              className="flex items-center gap-1 text-sm text-primary-foreground/70 hover:text-primary-foreground mb-6 self-start"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-accent/20 p-4 mb-6">
                <CheckCircle2 className="h-10 w-10 text-accent" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Check your inbox</h2>
              <p className="text-primary-foreground/70 text-sm mb-8 max-w-xs">
                We sent a 6-digit code to{" "}
                <strong className="text-primary-foreground">{email}</strong>.
              </p>

              <InputOTP
                maxLength={6}
                value={code}
                onChange={onCodeChange}
                disabled={verifying}
                autoFocus
                containerClassName="justify-center"
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="h-14 w-12 text-2xl font-bold bg-white/10 border-white/20 text-primary-foreground"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>

              {verifying && (
                <p className="mt-6 text-sm text-primary-foreground/70 animate-pulse">
                  Verifying...
                </p>
              )}

              <button
                type="button"
                onClick={() => { void handleSendCode(new Event("submit") as unknown as React.FormEvent); }}
                disabled={loading}
                className="mt-8 text-sm text-primary-foreground/70 hover:text-primary-foreground underline-offset-4 hover:underline disabled:opacity-50"
              >
                {loading ? "Sending..." : "Resend code"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
