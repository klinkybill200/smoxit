import { useEffect, useRef, useState } from "react";
import { X, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-chat`;

const STARTER: Msg = {
  role: "assistant",
  content: "Hey, I'm your SMOXIT Coach. 💪 What's up? Craving, stress, or just want to talk?",
};

interface Props {
  onClose: () => void;
  whyQuit?: string;
  pace?: "gentle" | "normal" | "fast";
}

export const CoachChat = ({ onClose, whyQuit, pace }: Props) => {
  const [messages, setMessages] = useState<Msg[]>([STARTER]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    const systemCtx: Array<{ role: "system"; content: string }> = [];
    if (whyQuit) systemCtx.push({ role: "system", content: `User's reason to quit: "${whyQuit}"` });
    if (pace) {
      const paceNote =
        pace === "gentle"
          ? "User chose a GENTLE pace. Tone: extra soft, fully patient, never pushy. Frame every suggestion as optional. Fully normalize slips and breaks. When proposing a step-by-step plan, use very small, low-effort steps spread out generously over time (e.g. cut down by 1 cig every few days, weeks between milestones). Always offer the option to slow down further."
          : pace === "fast"
          ? "User chose a FAST pace. Tone: still warm and zero shame, but more direct and momentum-focused. When proposing a step-by-step plan, suggest tighter, more ambitious milestones (e.g. quitting fully in days, daily check-ins, stretch goals). Still validate slips without judgement."
          : "User chose a STEADY pace. Tone: balanced, warm, encouraging without pressure. When proposing a step-by-step plan, use moderate milestones over a normal timeline (e.g. weekly milestones, gradual reduction). Slips are normal and never reset progress.";
      systemCtx.push({ role: "system", content: paceNote });
    }
    const payload = systemCtx.length ? [...systemCtx, ...next] : next;

    let acc = "";
    const upsert = (chunk: string) => {
      acc += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last !== STARTER && prev.indexOf(last) > next.length - 1) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: acc } : m));
        }
        return [...prev, { role: "assistant", content: acc }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: payload }),
      });
      if (resp.status === 429) { toast.error("Too many requests – please wait a moment."); setLoading(false); return; }
      if (resp.status === 402) { toast.error("Credits exhausted. Please top up."); setLoading(false); return; }
      if (!resp.ok || !resp.body) throw new Error("stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Coach is not reachable right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 px-3 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] backdrop-blur-sm">
      <div className="animate-slide-up flex max-h-full w-full max-w-[430px] flex-col overflow-hidden rounded-3xl bg-card shadow-elevated" style={{ height: "min(600px, 100%)" }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-accent">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-display font-black leading-tight">SMOXIT Coach</p>
              <p className="text-[10px] text-muted-foreground">Always here, always cheering 💙</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full bg-secondary p-2" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                  m.role === "user"
                    ? "rounded-br-sm bg-accent text-accent-foreground"
                    : "rounded-bl-sm bg-secondary text-foreground"
                }`}
              >
                {m.content || "…"}
              </div>
            </div>
          ))}
          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-secondary px-4 py-2 text-sm">
                <span className="inline-flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-accent" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "0.15s" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "0.3s" }} />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Message your coach…"
              rows={1}
              className="flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="h-10 w-10 shrink-0 rounded-full bg-accent text-primary hover:bg-accent/90">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
