import { useState } from "react";
import { Heart, UserPlus, Send, Quote } from "lucide-react";
import { useUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ReferralCard } from "@/components/ReferralCard";
import { toast } from "sonner";
import type { CommunityPost } from "@/lib/types";

const initialPosts: CommunityPost[] = [
  { id: "1", text: "Day 14 done! Never going back 💪", likes: 84, timeAgo: "2h ago" },
  { id: "2", text: "Had a craving at work, used the breathing tool. It worked!", likes: 41, timeAgo: "4h ago" },
  { id: "3", text: "Saved €300 in my first month. Bought myself new running shoes 🏃", likes: 152, timeAgo: "1d ago" },
  { id: "4", text: "6 months smoke-free today. My kids hugged me extra long.", likes: 309, timeAgo: "1d ago" },
  { id: "5", text: "Anyone else craving sweets like crazy? It passes — I promise.", likes: 27, timeAgo: "2d ago" },
];

const successStories = [
  { name: "Anna, 2 yrs", quote: "Best decision of my life. I run marathons now." },
  { name: "Marco, 8 mo", quote: "I wake up not coughing. That alone is everything." },
  { name: "Lina, 3 yrs", quote: "My daughter says I smell like 'mom' again. I cried." },
];

export const CommunityScreen = () => {
  const { user } = useUser();
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts);
  const [draft, setDraft] = useState("");

  if (!user) return null;

  const toggleLike = (id: string) =>
    setPosts((p) =>
      p.map((x) => (x.id === id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : x))
    );

  const submit = () => {
    if (!draft.trim()) return;
    setPosts((p) => [
      { id: crypto.randomUUID(), text: draft.trim().slice(0, 200), likes: 0, timeAgo: "now" },
      ...p,
    ]);
    setDraft("");
    toast.success("Win shared. The community salutes you. 💙");
  };

  return (
    <div className="space-y-4 pt-2">
      <h1 className="font-display text-3xl font-black">Community</h1>
      <p className="text-sm text-muted-foreground">You're not alone. Thousands are quitting with you.</p>

      {/* Quit buddy */}
      <section className="rounded-2xl bg-gradient-hero p-5 text-primary-foreground">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Quit Buddy</p>
        <p className="mt-1 font-display text-xl font-black leading-snug text-balance">
          Quit with a friend — accountability doubles your success.
        </p>
        <Button
          onClick={() => {
            navigator.clipboard?.writeText("https://smoxit.app/invite/you");
            toast.success("Invite link copied!");
          }}
          className="mt-4 h-12 w-full bg-accent font-bold text-primary hover:bg-accent-glow"
        >
          <UserPlus className="mr-2 h-4 w-4" /> Invite a Buddy
        </Button>
      </section>

      {/* Composer */}
      <section className="smoxit-card">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Share Your Win</p>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 200))}
          placeholder="What victory did you win today?"
          className="mt-2 min-h-20 resize-none border-border"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{draft.length}/200 · anonymous</span>
          <Button onClick={submit} disabled={!draft.trim()} size="sm" className="bg-accent font-bold text-primary hover:bg-accent-glow">
            <Send className="mr-1 h-3.5 w-3.5" /> Post
          </Button>
        </div>
      </section>

      {/* Feed */}
      <section className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Community Feed (Anonymous)</p>
        {posts.map((p) => (
          <div key={p.id} className="smoxit-card">
            <p className="text-sm font-medium leading-snug">{p.text}</p>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{p.timeAgo}</span>
              <button
                onClick={() => toggleLike(p.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition-bounce ${
                  p.liked ? "bg-destructive/10 text-destructive" : "bg-secondary"
                }`}
              >
                <Heart className={`h-3.5 w-3.5 ${p.liked ? "fill-current" : ""}`} />
                <span className="font-bold">{p.likes}</span>
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Success stories */}
      <section className="space-y-2 pt-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Success Stories</p>
        {successStories.map((s) => (
          <div key={s.name} className="rounded-2xl border border-accent/30 bg-accent/10 p-4">
            <Quote className="h-5 w-5 text-accent" />
            <p className="mt-2 font-display text-base font-bold leading-snug text-balance">"{s.quote}"</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">— {s.name} smoke-free</p>
          </div>
        ))}
      </section>
    </div>
  );
};
