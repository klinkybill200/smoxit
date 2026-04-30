import { useState } from "react";
import { Mail, ArrowRight, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { SmoxitLogo } from "@/components/SmoxitLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Step = "email" | "code";

export const AuthScreen = () => {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const sendCode = async (targetEmail: string) => {
    // No emailRedirectTo → Supabase sends a 6-digit code instead of a magic link.
    const { error } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    setLoading(true);
    try {
      await sendCode(normalized);
      setEmail(normalized);
      setStep("code");
      toast.success("Code sent! Check your inbox.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (value: string) => {
    if (value.length !== 6) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: value,
        type: "email",
      });
      if (error) throw error;
      toast.success("You're in! 🎉");
      // AuthProvider will pick up the session and route accordingly.
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid or expired code.";
      toast.error(msg);
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await sendCode(email);
      toast.success("New code sent.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't resend code.";
      toast.error(msg);
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

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="flex-1 flex flex-col">
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
              onClick={() => { setStep("email"); setCode(""); }}
              className="self-start flex items-center gap-1 text-sm text-primary-foreground/70 hover:text-primary-foreground mb-6"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <div className="rounded-full bg-accent/20 p-4 mb-6 self-center">
              <CheckCircle2 className="h-10 w-10 text-accent" />
            </div>

            <h2 className="text-2xl font-bold text-center mb-2">Enter your code</h2>
            <p className="text-primary-foreground/70 text-sm text-center mb-8">
              We sent a 6-digit code to{" "}
              <strong className="text-primary-foreground">{email}</strong>
            </p>

            <div className="flex justify-center mb-6">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(v) => {
                  setCode(v);
                  if (v.length === 6) handleVerify(v);
                }}
                disabled={loading}
                autoFocus
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="h-12 w-10 text-lg bg-white/10 border-white/20 text-primary-foreground"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {loading && (
              <p className="text-center text-primary-foreground/70 text-sm animate-pulse">
                Verifying...
              </p>
            )}

            <div className="mt-auto pt-8 text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="text-sm text-primary-foreground/70 hover:text-primary-foreground underline-offset-4 hover:underline disabled:opacity-50"
              >
                Didn't get it? Resend code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
