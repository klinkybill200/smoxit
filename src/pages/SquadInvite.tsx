import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { SmoxitLogo } from "@/components/SmoxitLogo";
import { Users, Target, Sparkles, ArrowRight, CheckCircle2, MessageCircle, Mail, Share2 } from "lucide-react";
import { SQUAD_INVITE_KEY, applyPendingSquadInvite, buildSquadShareMessage } from "@/lib/squadInvite";
import { AuthScreen } from "@/components/AuthScreen";
import { toast } from "sonner";

interface Preview {
  id: string;
  name: string;
  goal: string | null;
  member_count: number;
}

const SquadInvite = () => {
  const { code: paramCode } = useParams();
  const [search] = useSearchParams();
  const code = (paramCode || search.get("code") || "").toUpperCase();
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [joining, setJoining] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [joined, setJoined] = useState(false);

  // Persist invite code so it survives sign-up flow
  useEffect(() => {
    if (code) {
      try { localStorage.setItem(SQUAD_INVITE_KEY, code); } catch {}
    }
  }, [code]);

  // Fetch squad preview (works for anon via SECURITY DEFINER RPC)
  useEffect(() => {
    if (!code) { setNotFound(true); setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase.rpc("get_squad_preview", { _code: code });
      if (error || !data || data.length === 0) {
        setNotFound(true);
      } else {
        setPreview(data[0] as Preview);
      }
      setLoading(false);
    })();
  }, [code]);

  // If already signed in, auto-join and show success screen
  useEffect(() => {
    if (authLoading || !session?.user || !preview || joined) return;
    (async () => {
      setJoining(true);
      const name = await applyPendingSquadInvite(session.user.id);
      if (name) toast.success(`Joined squad ${name} 🎉`);
      setJoining(false);
      setJoined(true);
    })();
  }, [authLoading, session?.user?.id, preview, joined]);

  const handleJoin = () => {
    try { localStorage.setItem(SQUAD_INVITE_KEY, code); } catch {}
    if (session) return; // effect above auto-joins
    setSigningUp(true);
  };

  if (signingUp && !session) {
    // Inline sign-up keeps user on /invite/:code so the auth listener
    // can auto-join the squad immediately after sign-in.
    return <AuthScreen />;
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero text-primary-foreground flex flex-col items-center justify-center">
        <SmoxitLogo size={64} variant="light" />
        <p className="mt-6 text-primary-foreground/70 animate-pulse">Loading invite…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-hero text-primary-foreground flex flex-col items-center justify-center px-6 text-center">
        <SmoxitLogo size={56} variant="light" />
        <h1 className="mt-6 text-2xl font-bold">Invite not found</h1>
        <p className="mt-2 text-primary-foreground/70">
          The squad code <span className="font-mono">{code || "—"}</span> doesn't exist or has expired.
        </p>
        <Button className="mt-8" onClick={() => navigate("/", { replace: true })}>
          Go to SMOXIT
        </Button>
      </div>
    );
  }

  if (joined && preview) {
    const openChat = () => {
      try { sessionStorage.setItem("smoxit:open_tab", "community"); } catch {}
      navigate("/", { replace: true });
    };
    const message = buildSquadShareMessage(code, preview.name);
    const shareWhatsApp = () => {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    };
    const shareEmail = () => {
      const subject = `Join my SMOXIT Quit-Squad ${preview.name}`;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    };
    return (
      <div className="min-h-screen bg-gradient-hero text-primary-foreground flex flex-col items-center justify-center px-6 text-center">
        <div className="animate-fade-in flex w-full max-w-xs flex-col items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/20 backdrop-blur">
            <CheckCircle2 className="h-12 w-12 text-accent" strokeWidth={2.5} />
          </div>
          <h1 className="mt-6 text-3xl font-bold">You're in! 🎉</h1>
          <p className="mt-3 text-primary-foreground/80">
            Welcome to <span className="font-semibold text-accent">{preview.name}</span>. Your squad is ready to cheer you on.
          </p>
          <div className="mt-6 rounded-2xl bg-white/10 px-5 py-3 backdrop-blur">
            <div className="text-xs uppercase tracking-wider text-primary-foreground/60">Members</div>
            <div className="text-2xl font-bold">{(preview.member_count ?? 0) + 1}</div>
          </div>
          <Button size="lg" className="mt-8 h-14 w-full text-base font-semibold" onClick={openChat}>
            <MessageCircle className="mr-1 h-5 w-5" /> Open Squad chat
          </Button>

          <div className="mt-6 w-full rounded-2xl border border-white/15 bg-white/5 p-4">
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary-foreground/90">
              <Share2 className="h-4 w-4 text-accent" /> Invite another friend
            </div>
            <div className="mt-1 font-mono text-lg tracking-[0.3em] text-accent">{code}</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" className="h-11" onClick={shareWhatsApp}>
                <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
              </Button>
              <Button variant="secondary" className="h-11" onClick={shareEmail}>
                <Mail className="mr-1 h-4 w-4" /> Email
              </Button>
            </div>
          </div>

          <button
            className="mt-4 text-sm text-primary-foreground/70 underline-offset-4 hover:underline"
            onClick={() => navigate("/", { replace: true })}
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero text-primary-foreground flex flex-col">
      <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col px-6 pt-12 pb-10">
        <div className="flex items-center gap-3">
          <SmoxitLogo size={36} variant="light" />
          <span className="text-lg font-semibold tracking-tight">SMOXIT</span>
        </div>

        <div className="mt-10 flex-1 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 self-start rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wider text-primary-foreground/80">
            <Sparkles className="h-3.5 w-3.5" /> Quit-Squad invite
          </div>
          <h1 className="mt-4 text-3xl font-bold leading-tight">
            You're invited to join<br />
            <span className="text-accent">{preview!.name}</span>
          </h1>
          <p className="mt-3 text-primary-foreground/75">
            Quit smoking together. Share progress, cheer each other on, and crush cravings as a team.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <Users className="h-5 w-5 text-accent" />
              <div className="mt-2 text-2xl font-bold">{preview!.member_count}</div>
              <div className="text-xs text-primary-foreground/70">Members</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <Target className="h-5 w-5 text-accent" />
              <div className="mt-2 text-sm font-semibold line-clamp-2">
                {preview!.goal || "Stay smoke-free"}
              </div>
              <div className="text-xs text-primary-foreground/70 mt-1">Squad goal</div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-wider text-primary-foreground/60">Squad code</div>
            <div className="mt-1 font-mono text-2xl tracking-[0.3em]">{code}</div>
          </div>
        </div>

        <Button
          size="lg"
          className="mt-8 h-14 text-base font-semibold"
          onClick={handleJoin}
          disabled={joining}
        >
          {session ? "Join squad" : "Sign up & join"} <ArrowRight className="ml-1 h-5 w-5" />
        </Button>
        <p className="mt-3 text-center text-xs text-primary-foreground/60">
          Free 7-day trial · No credit card required
        </p>
      </div>
    </div>
  );
};

export default SquadInvite;
