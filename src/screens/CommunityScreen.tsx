import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, MessageCircle, Repeat2, Send, Plus, X, Crown, Trophy, Users, Copy, LogOut, Share2, Mail, MessageSquare, Sparkles, CheckCircle2 } from "lucide-react";
import { useUser } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { anonName, anonColor, levelFromXp, timeAgo, generateSquadCode, CATEGORY_META, type Category } from "@/lib/community";
import { useProfiles, displayName, displayInitial, displayColor } from "@/lib/profiles";
import { getDuration, moneySaved, todayKey } from "@/lib/calc";
import { awardXp } from "@/lib/xp";
import { ReferralCard } from "@/components/ReferralCard";
import { buildSquadShareUrl, buildSquadShareMessage } from "@/lib/squadInvite";

type SubTab = "feed" | "squads" | "challenges";

export const CommunityScreen = () => {
  const { user: authUser } = useAuth();
  const [tab, setTab] = useState<SubTab>("feed");

  if (!authUser) {
    return (
      <div className="space-y-3 pt-4 text-center">
        <h1 className="font-display text-2xl font-black">Community</h1>
        <p className="text-sm text-muted-foreground">Sign in to join the community.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2 pb-24">
      <div>
        <h1 className="font-display text-2xl font-black">Community</h1>
        <p className="text-xs text-muted-foreground">You're not alone. Quit together.</p>
      </div>

      {/* Sub-tab bar */}
      <div className="flex border-b border-border">
        {(["feed", "squads", "challenges"] as SubTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-bold capitalize transition-smooth border-b-2 ${
              tab === t ? "border-accent text-accent" : "border-transparent text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "feed" && <FeedTab userId={authUser.id} />}
      {tab === "squads" && <SquadsTab userId={authUser.id} />}
      {tab === "challenges" && <ChallengesTab userId={authUser.id} />}
    </div>
  );
};

/* ------------------------------- FEED TAB ------------------------------- */

const FILTERS: { id: Category | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "win", label: "🔥 Wins" },
  { id: "struggle", label: "😤 Struggles" },
  { id: "advice", label: "💬 Advice" },
  { id: "milestone", label: "🎉 Milestones" },
];

interface PostRow {
  id: string;
  user_id: string;
  category: Category;
  content: string;
  show_stats: boolean;
  reactions: number;
  me_too: number;
  created_at: string;
  _stats?: { days: number; saved: number };
}
interface CommentRow {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  reactions: number;
  created_at: string;
}

const FeedTab = ({ userId }: { userId: string }) => {
  const { user } = useUser();
  const [filter, setFilter] = useState<Category | "all">("all");
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set()); // `${postId}:${type}`
  const [composerOpen, setComposerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPosts = async () => {
    let q = supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(50);
    if (filter !== "all") q = q.eq("category", filter);
    const { data } = await q;
    setPosts((data ?? []) as PostRow[]);
    setLoading(false);
  };

  const loadReactions = async () => {
    const { data } = await supabase.from("post_reactions").select("post_id,type").eq("user_id", userId);
    setMyReactions(new Set((data ?? []).map((r: any) => `${r.post_id}:${r.type}`)));
  };

  useEffect(() => {
    loadPosts();
    loadReactions();
    const channel = supabase
      .channel("posts-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => loadPosts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const toggleReaction = async (postId: string, type: "like" | "me_too") => {
    const key = `${postId}:${type}`;
    const has = myReactions.has(key);
    // optimistic
    setMyReactions((s) => {
      const n = new Set(s);
      if (has) n.delete(key); else n.add(key);
      return n;
    });
    setPosts((ps) => ps.map((p) => p.id === postId ? {
      ...p,
      reactions: type === "like" ? p.reactions + (has ? -1 : 1) : p.reactions,
      me_too: type === "me_too" ? p.me_too + (has ? -1 : 1) : p.me_too,
    } : p));
    if (has) {
      await supabase.from("post_reactions").delete().match({ user_id: userId, post_id: postId, type });
    } else {
      await supabase.from("post_reactions").insert({ user_id: userId, post_id: postId, type });
    }
  };

  return (
    <div className="space-y-3">
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-bounce ${
              filter === f.id ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-center text-xs text-muted-foreground">Loading…</p>}
      {!loading && posts.length === 0 && (
        <div className="smoxit-card text-center">
          <p className="text-sm text-muted-foreground">No posts yet. Be the first to share!</p>
        </div>
      )}

      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          isMine={p.user_id === userId}
          liked={myReactions.has(`${p.id}:like`)}
          meToo={myReactions.has(`${p.id}:me_too`)}
          onReact={(type) => toggleReaction(p.id, type)}
          currentUserId={userId}
        />
      ))}

      <div className="pt-4">
        <ReferralCard />
      </div>

      {/* FAB */}
      <button
        onClick={() => setComposerOpen(true)}
        className="fixed bottom-24 right-5 z-30 flex items-center gap-2 rounded-full bg-accent px-5 py-3 font-bold text-accent-foreground shadow-button transition-bounce active:scale-95"
      >
        <Plus className="h-4 w-4" /> Share
      </button>

      {composerOpen && user && (
        <Composer
          userId={userId}
          stats={{
            days: getDuration(user.quitDate).days,
            saved: moneySaved(user),
          }}
          onClose={() => setComposerOpen(false)}
          onPosted={() => { setComposerOpen(false); loadPosts(); }}
        />
      )}
    </div>
  );
};

const PostCard = ({
  post, liked, meToo, onReact, currentUserId,
}: {
  post: PostRow; isMine: boolean; liked: boolean; meToo: boolean;
  onReact: (t: "like" | "me_too") => void; currentUserId: string;
}) => {
  const [openComments, setOpenComments] = useState(false);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [draft, setDraft] = useState("");
  const cat = CATEGORY_META[post.category];

  const userIds = useMemo(
    () => Array.from(new Set([post.user_id, ...comments.map((c) => c.user_id)])),
    [post.user_id, comments],
  );
  const profiles = useProfiles(userIds);
  const authorProfile = profiles[post.user_id];
  const name = displayName(authorProfile, post.user_id);
  const color = displayColor(post.user_id);
  const initial = displayInitial(authorProfile, post.user_id);
  const avatarUrl = authorProfile?.avatar_url;

  const loadComments = async () => {
    const { data } = await supabase.from("comments").select("*").eq("post_id", post.id).order("created_at");
    setComments((data ?? []) as CommentRow[]);
  };

  const toggleComments = async () => {
    if (!openComments) await loadComments();
    setOpenComments((v) => !v);
  };

  const submitComment = async () => {
    const text = draft.trim();
    if (!text) return;
    const { error } = await supabase.from("comments").insert({
      post_id: post.id, user_id: currentUserId, content: text.slice(0, 280),
    });
    if (error) { toast.error("Could not post"); return; }
    setDraft("");
    await loadComments();
    awardXp("comment_posted", { silent: true });
  };

  const visible = showAll ? comments : comments.slice(0, 3);

  return (
    <div className="smoxit-card space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white text-sm" style={{ background: color }}>
          {avatarUrl ? <img src={avatarUrl} alt={name} className="h-full w-full object-cover" /> : initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{name}</p>
          <p className="text-[10px] text-muted-foreground">{timeAgo(post.created_at)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${cat.color}`}>
          {cat.emoji} {cat.label}
        </span>
      </div>

      {post.show_stats && (
        <div className="rounded-lg bg-secondary px-3 py-1.5 text-[11px] font-bold text-secondary-foreground">
          🚭 Sharing their journey
        </div>
      )}

      <p className="text-sm leading-snug whitespace-pre-wrap">{post.content}</p>

      <div className="flex items-center gap-1 -mb-1">
        <ReactionBtn active={liked} onClick={() => onReact("like")} icon="👍" count={post.reactions} />
        <ReactionBtn active={openComments} onClick={toggleComments} icon="💬" count={comments.length || undefined} />
        <ReactionBtn active={meToo} onClick={() => onReact("me_too")} icon="🔁" count={post.me_too} label="Me too" />
      </div>

      {openComments && (
        <div className="space-y-2 border-t border-border pt-3">
          {visible.map((c) => {
            const cp = profiles[c.user_id];
            const cName = displayName(cp, c.user_id);
            return (
              <div key={c.id} className="flex gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white" style={{ background: displayColor(c.user_id) }}>
                  {cp?.avatar_url ? <img src={cp.avatar_url} alt={cName} className="h-full w-full object-cover" /> : cName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 rounded-lg bg-secondary px-3 py-2">
                  <p className="text-[11px] font-bold">{cName} <span className="ml-1 font-normal text-muted-foreground">{timeAgo(c.created_at)}</span></p>
                  <p className="text-xs">{c.content}</p>
                </div>
              </div>
            );
          })}
          {comments.length > 3 && !showAll && (
            <button onClick={() => setShowAll(true)} className="text-xs font-bold text-accent">
              Show all {comments.length} comments
            </button>
          )}
          <div className="flex gap-2 pt-1">
            <Input value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 280))} placeholder="Add a comment..." className="h-9 text-xs" />
            <Button onClick={submitComment} disabled={!draft.trim()} size="sm" className="h-9 bg-accent text-accent-foreground hover:bg-accent-glow">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const ReactionBtn = ({ active, onClick, icon, count, label }: {
  active: boolean; onClick: () => void; icon: string; count?: number; label?: string;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition-bounce ${
      active ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-secondary"
    }`}
  >
    <span>{icon}</span>
    {label && <span className="text-[11px]">{label}</span>}
    {count !== undefined && count > 0 && <span>{count}</span>}
  </button>
);

const Composer = ({ userId, stats, onClose, onPosted }: {
  userId: string; stats: { days: number; saved: number };
  onClose: () => void; onPosted: () => void;
}) => {
  const [category, setCategory] = useState<Category>("win");
  const [content, setContent] = useState("");
  const [showStats, setShowStats] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("posts").insert({
      user_id: userId, category, content: content.trim().slice(0, 280), show_stats: showStats,
    });
    setSubmitting(false);
    if (error) { toast.error("Could not post"); return; }
    awardXp("post_shared", { silent: true });
    toast.success("Shared with the community 💙");
    onPosted();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div className="w-full rounded-t-3xl bg-card p-5 pb-[calc(env(safe-area-inset-bottom)+5rem)] space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-black">Share with community</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                category === c ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
            </button>
          ))}
        </div>
        <Textarea value={content} onChange={(e) => setContent(e.target.value.slice(0, 280))} placeholder="What victory did you win today?" className="min-h-24 resize-none" />
        <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
          <div>
            <p className="text-xs font-bold">Show my stats</p>
            <p className="text-[10px] text-muted-foreground">{stats.days} days · saved €{stats.saved.toFixed(0)}</p>
          </div>
          <Switch checked={showStats} onCheckedChange={setShowStats} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">{content.length}/280 · anonymous</span>
          <Button onClick={submit} disabled={!content.trim() || submitting} className="bg-accent font-bold text-accent-foreground hover:bg-accent-glow">
            <Send className="mr-1 h-3.5 w-3.5" /> Post
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------- SQUADS TAB ------------------------------- */

interface Squad {
  id: string; name: string; code: string; is_public: boolean; goal: string | null; created_by: string; created_at: string; max_members: number;
}
interface SquadMember { squad_id: string; user_id: string; joined_at: string; }
interface SquadMessage { id: string; squad_id: string; user_id: string; content: string; is_system: boolean; is_pinned: boolean; created_at: string; }

const SquadsTab = ({ userId }: { userId: string }) => {
  const [mySquads, setMySquads] = useState<Squad[]>([]);
  const [activeSquad, setActiveSquad] = useState<Squad | null>(null);
  const [publicSquads, setPublicSquads] = useState<(Squad & { member_count: number })[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadMine = async () => {
    const { data: mems } = await supabase.from("squad_members").select("squad_id").eq("user_id", userId);
    const ids = (mems ?? []).map((m: any) => m.squad_id);
    if (ids.length === 0) { setMySquads([]); setActiveSquad(null); }
    else {
      const { data } = await supabase.from("squads").select("*").in("id", ids);
      setMySquads((data ?? []) as Squad[]);
      if (!activeSquad && data && data.length > 0) setActiveSquad(data[0] as Squad);
    }
    setLoading(false);
  };

  const loadPublic = async () => {
    const { data } = await supabase.from("squads").select("*").eq("is_public", true).order("created_at", { ascending: false }).limit(20);
    if (!data) return;
    const counts = await Promise.all(
      data.map(async (s: any) => {
        const { count } = await supabase.from("squad_members").select("*", { count: "exact", head: true }).eq("squad_id", s.id);
        return { ...s, member_count: count ?? 0 };
      })
    );
    setPublicSquads(counts as any);
  };

  useEffect(() => { loadMine(); loadPublic(); /* eslint-disable-next-line */ }, []);

  if (loading) return <p className="text-center text-xs text-muted-foreground">Loading…</p>;

  if (activeSquad) {
    return (
      <SquadHome
        squad={activeSquad}
        userId={userId}
        onLeave={async () => {
          await supabase.from("squad_members").delete().match({ squad_id: activeSquad.id, user_id: userId });
          setActiveSquad(null);
          loadMine();
        }}
        onSwitchAway={() => setActiveSquad(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-hero p-5 text-primary-foreground">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Squads</p>
        <p className="mt-1 font-display text-xl font-black leading-snug">Quit together. It's 2× easier.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setCreateOpen(true)} className="rounded-2xl bg-primary p-4 text-left text-primary-foreground transition-bounce active:scale-95">
          <Users className="h-5 w-5 text-accent" />
          <p className="mt-2 font-bold">Create</p>
          <p className="text-[10px] opacity-80">Start a squad</p>
        </button>
        <button onClick={() => setJoinOpen(true)} className="rounded-2xl bg-accent p-4 text-left text-accent-foreground transition-bounce active:scale-95">
          <Plus className="h-5 w-5" />
          <p className="mt-2 font-bold">Join</p>
          <p className="text-[10px] opacity-80">With a code</p>
        </button>
      </div>

      {mySquads.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your squads</p>
          {mySquads.map((s) => (
            <button key={s.id} onClick={() => setActiveSquad(s)} className="smoxit-card flex w-full items-center justify-between text-left">
              <div>
                <p className="text-sm font-bold">{s.name}</p>
                <p className="text-[11px] text-muted-foreground">Code {s.code}</p>
              </div>
              <span className="text-xs font-bold text-accent">Open →</span>
            </button>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Active squads looking for members</p>
        {publicSquads.length === 0 && <p className="text-xs text-muted-foreground">No public squads yet — be the first to start one!</p>}
        {publicSquads.map((s) => (
          <div key={s.id} className="smoxit-card flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{s.name}</p>
              <p className="text-[11px] text-muted-foreground">{s.member_count}/{s.max_members} members · code {s.code}</p>
            </div>
            <Button
              size="sm"
              className="bg-accent font-bold text-accent-foreground hover:bg-accent-glow"
              onClick={async () => {
                if (s.member_count >= s.max_members) { toast.error("Squad full"); return; }
                const { error } = await supabase.from("squad_members").insert({ squad_id: s.id, user_id: userId });
                if (error) { toast.error("Could not join"); return; }
                toast.success(`Joined ${s.name}`);
                loadMine();
              }}
            >
              Join
            </Button>
          </div>
        ))}
      </section>

      {createOpen && (
        <CreateSquadSheet userId={userId} onClose={() => setCreateOpen(false)} onCreated={(s) => { setCreateOpen(false); loadMine(); loadPublic(); setActiveSquad(s); }} />
      )}
      {joinOpen && (
        <JoinSquadSheet userId={userId} onClose={() => setJoinOpen(false)} onJoined={() => { setJoinOpen(false); loadMine(); }} />
      )}
    </div>
  );
};

const CreateSquadSheet = ({ userId, onClose, onCreated }: { userId: string; onClose: () => void; onCreated: (s: Squad) => void }) => {
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const code = generateSquadCode();
    const { data, error } = await supabase.from("squads").insert({
      name: name.trim().slice(0, 40), code, is_public: isPublic, created_by: userId,
    }).select().single();
    if (error || !data) { setBusy(false); toast.error("Could not create"); return; }
    await supabase.from("squad_members").insert({ squad_id: data.id, user_id: userId });
    toast.success(`Squad created. Code: ${data.code}`);
    setBusy(false);
    onCreated(data as Squad);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div className="w-full rounded-t-3xl bg-card p-5 pb-[calc(env(safe-area-inset-bottom)+5rem)] space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-black">Create a Squad</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Squad name" />
        <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
          <div>
            <p className="text-xs font-bold">{isPublic ? "Public" : "Private"}</p>
            <p className="text-[10px] text-muted-foreground">{isPublic ? "Anyone can join" : "Code only"}</p>
          </div>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </div>
        <Button onClick={create} disabled={!name.trim() || busy} className="w-full bg-accent font-bold text-accent-foreground hover:bg-accent-glow">
          Create Squad
        </Button>
      </div>
    </div>
  );
};

const JoinSquadSheet = ({ userId, onClose, onJoined }: { userId: string; onClose: () => void; onJoined: () => void }) => {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const join = async () => {
    setBusy(true);
    const { data: squad } = await supabase.from("squads").select("*").eq("code", code.trim().toUpperCase()).maybeSingle();
    if (!squad) { setBusy(false); toast.error("Squad not found"); return; }
    const { error } = await supabase.from("squad_members").insert({ squad_id: squad.id, user_id: userId });
    setBusy(false);
    if (error) { toast.error("Could not join (already a member?)"); return; }
    toast.success(`Joined ${squad.name}`);
    onJoined();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div className="w-full rounded-t-3xl bg-card p-5 pb-[calc(env(safe-area-inset-bottom)+5rem)] space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-black">Join a Squad</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="6-digit code" maxLength={6} className="text-center font-mono text-lg tracking-widest" />
        <Button onClick={join} disabled={code.length < 4 || busy} className="w-full bg-accent font-bold text-accent-foreground hover:bg-accent-glow">
          Join
        </Button>
      </div>
    </div>
  );
};

const SquadHome = ({ squad, userId, onLeave, onSwitchAway }: {
  squad: Squad; userId: string; onLeave: () => void; onSwitchAway: () => void;
}) => {
  const [shareOpen, setShareOpen] = useState(false);
  const { user } = useUser();
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [messages, setMessages] = useState<SquadMessage[]>([]);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("squad_members").select("*").eq("squad_id", squad.id).then(({ data }) => setMembers((data ?? []) as SquadMember[]));
    supabase.from("squad_messages").select("*").eq("squad_id", squad.id).order("created_at").limit(100)
      .then(({ data }) => setMessages((data ?? []) as SquadMessage[]));

    const ch = supabase
      .channel(`squad-${squad.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "squad_messages", filter: `squad_id=eq.${squad.id}` }, (payload) => {
        setMessages((m) => [...m, payload.new as SquadMessage]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "squad_members", filter: `squad_id=eq.${squad.id}` }, () => {
        supabase.from("squad_members").select("*").eq("squad_id", squad.id).then(({ data }) => setMembers((data ?? []) as SquadMember[]));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [squad.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await supabase.from("squad_messages").insert({ squad_id: squad.id, user_id: userId, content: text.slice(0, 280) });
  };

  const myDays = user ? getDuration(user.quitDate).days : 0;
  // we don't have other members' real stats — placeholder leaderboard
  const leaderboard = members.map((m) => ({
    user_id: m.user_id,
    days: m.user_id === userId ? myDays : Math.max(1, Math.floor((Date.now() - new Date(m.joined_at).getTime()) / 86400000)),
  })).sort((a, b) => b.days - a.days);

  const squadStreak = leaderboard.length ? Math.min(...leaderboard.map((l) => l.days)) : 0;
  const totalCigsAvoided = user ? Math.floor((user.cigsPerDay / 24) * getDuration(user.quitDate).totalHours) * members.length : 0;
  const milestoneTarget = 30;
  const progress = Math.min(100, (squadStreak / milestoneTarget) * 100);

  const pinned = messages.find((m) => m.is_pinned);

  return (
    <div className="space-y-3">
      <button onClick={onSwitchAway} className="text-xs font-bold text-accent">← All squads</button>

      <div className="rounded-2xl bg-gradient-hero p-4 text-primary-foreground">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-black">{squad.name}</p>
          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">{members.length}/8</span>
        </div>
        <p className="text-[10px] uppercase tracking-widest opacity-70">Code {squad.code}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white/10 px-3 py-2">
            <p className="text-[10px] uppercase opacity-70">Squad streak</p>
            <p className="font-display text-xl font-black">{squadStreak}d</p>
          </div>
          <div className="rounded-lg bg-white/10 px-3 py-2">
            <p className="text-[10px] uppercase opacity-70">Cigs avoided</p>
            <p className="font-display text-xl font-black">{totalCigsAvoided.toLocaleString()}</p>
          </div>
        </div>
        <div className="mt-3">
          <p className="text-[10px] opacity-70">Next milestone: {milestoneTarget} days as squad</p>
          <Progress value={progress} className="mt-1 h-1.5 bg-white/10" />
        </div>
      </div>

      {pinned && (
        <div className="rounded-xl border border-accent/40 bg-accent/10 p-3">
          <p className="text-[10px] font-bold uppercase text-accent">📌 Pinned goal</p>
          <p className="text-sm">{pinned.content}</p>
        </div>
      )}

      <details className="smoxit-card">
        <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-muted-foreground">Leaderboard</summary>
        <div className="mt-2 space-y-1.5">
          {leaderboard.map((m, i) => (
            <div key={m.user_id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold w-4">{i + 1}</span>
                <div className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: anonColor(m.user_id) }}>
                  {anonName(m.user_id).charAt(0)}
                </div>
                <span>{anonName(m.user_id)}</span>
                {i === 0 && <Crown className="h-3 w-3 text-accent" />}
              </div>
              <span className="font-bold">{m.days}d</span>
            </div>
          ))}
        </div>
      </details>

      <div className="smoxit-card flex flex-col">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Squad chat</p>
        <div ref={scrollRef} className="mt-2 max-h-72 space-y-2 overflow-y-auto">
          {messages.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">No messages yet — say hi 👋</p>}
          {messages.map((m) => m.is_system ? (
            <div key={m.id} className="text-center text-[11px] text-muted-foreground italic">{m.content}</div>
          ) : (
            <div key={m.id} className={`flex gap-2 ${m.user_id === userId ? "flex-row-reverse" : ""}`}>
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: anonColor(m.user_id) }}>
                {anonName(m.user_id).charAt(0)}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-3 py-1.5 text-xs ${m.user_id === userId ? "bg-accent text-accent-foreground" : "bg-secondary"}`}>
                <p className="text-[10px] font-bold opacity-70">{anonName(m.user_id)}</p>
                <p>{m.content}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Message your squad…" className="h-9 text-xs" />
          <Button onClick={send} disabled={!draft.trim()} size="sm" className="h-9 bg-accent text-accent-foreground hover:bg-accent-glow">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" className="flex-1 bg-accent font-bold text-accent-foreground hover:bg-accent-glow" onClick={() => setShareOpen(true)}>
          <Share2 className="mr-1 h-3 w-3" /> Invite friends
        </Button>
        <Button variant="outline" size="sm" className="flex-1 text-destructive" onClick={onLeave}>
          <LogOut className="mr-1 h-3 w-3" /> Leave
        </Button>
      </div>

      {shareOpen && <ShareSquadSheet squad={squad} onClose={() => setShareOpen(false)} />}
    </div>
  );
};

const ShareSquadSheet = ({ squad, onClose }: { squad: Squad; onClose: () => void }) => {
  const url = buildSquadShareUrl(squad.code);
  const message = buildSquadShareMessage(squad.code, squad.name);
  const encoded = encodeURIComponent(message);
  const subject = encodeURIComponent(`Join my SMOXIT Quit-Squad`);

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    toast.success(`${label} copied`);
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "SMOXIT Quit-Squad", text: message, url }); } catch {}
    } else {
      copy(message, "Invite");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div className="w-full rounded-t-3xl bg-card p-5 pb-[calc(env(safe-area-inset-bottom)+5rem)] space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-black">Invite to {squad.name}</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>

        <div className="rounded-2xl bg-gradient-hero p-5 text-center text-primary-foreground">
          <p className="text-[10px] uppercase tracking-widest opacity-70">Squad Code</p>
          <p className="font-mono text-3xl font-black tracking-[0.4em] mt-1">{squad.code}</p>
          <button onClick={() => copy(squad.code, "Code")} className="mt-2 text-[11px] font-bold text-accent inline-flex items-center gap-1">
            <Copy className="h-3 w-3" /> Tap to copy
          </button>
        </div>

        <div className="rounded-xl bg-secondary px-3 py-2 text-[11px] text-muted-foreground break-all">
          {url}
          <button onClick={() => copy(url, "Link")} className="ml-2 font-bold text-accent">Copy</button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <a
            href={`https://wa.me/?text=${encoded}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-3 text-sm font-bold text-white transition-bounce active:scale-95"
          >
            <MessageSquare className="h-4 w-4" /> WhatsApp
          </a>
          <a
            href={`mailto:?subject=${subject}&body=${encoded}`}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-bold text-primary-foreground transition-bounce active:scale-95"
          >
            <Mail className="h-4 w-4" /> Email
          </a>
        </div>

        <Button onClick={nativeShare} variant="outline" className="w-full">
          <Share2 className="mr-2 h-4 w-4" /> More share options
        </Button>

        <p className="text-[10px] text-center text-muted-foreground">
          New friends? They'll be sent straight into your squad after sign-up.
        </p>
      </div>
    </div>
  );
};

/* ----------------------------- CHALLENGES TAB ----------------------------- */

interface Challenge {
  id: string; title: string; description: string | null; start_date: string; end_date: string;
  target_participants: number | null; daily_tasks: string[] | null;
}
interface Participation {
  challenge_id: string; user_id: string; xp_earned: number; days_completed: number; last_completed_date: string | null;
}

interface AutoChallenge {
  id: string;
  title: string;
  emoji: string;
  desc: string;
  xp: number;
  /** progress 0..1 */
  progress: () => number;
  current: () => number;
  target: number;
  unit: string;
}

const ChallengesTab = ({ userId }: { userId: string }) => {
  const { user } = useUser();
  const [featured, setFeatured] = useState<Challenge | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [myPart, setMyPart] = useState<Participation | null>(null);
  const [past, setPast] = useState<Challenge[]>([]);
  const [myXp, setMyXp] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  // Build auto-tracked challenges from user data
  const autoChallenges = useMemo<AutoChallenge[]>(() => {
    if (!user) return [];
    const now = Date.now();
    const last7 = (ts: number) => now - ts < 7 * 86400000;
    const cravings7 = user.cravings.filter((c) => last7(c.timestamp) && c.resisted).length;
    const breaths7 = user.breathHolds.filter((b) => last7(new Date(b.date).getTime())).length;
    const moods7 = user.moods.filter((m) => last7(new Date(m.date).getTime())).length;
    const days = getDuration(user.quitDate).days;
    const logs = user.dailyLogs ?? [];
    const hydration7 = logs.filter((l) => last7(new Date(l.date).getTime())).reduce((s, l) => s + (l.hydration ?? 0), 0);

    return [
      {
        id: "wk-cravings-5",
        title: "Crush 5 cravings",
        emoji: "🔥",
        desc: "This week",
        xp: 50,
        target: 5,
        unit: "won",
        current: () => cravings7,
        progress: () => Math.min(1, cravings7 / 5),
      },
      {
        id: "wk-breaths-5",
        title: "5 breath sessions",
        emoji: "🌬️",
        desc: "This week",
        xp: 40,
        target: 5,
        unit: "done",
        current: () => breaths7,
        progress: () => Math.min(1, breaths7 / 5),
      },
      {
        id: "wk-mood-7",
        title: "7 mood check-ins",
        emoji: "😊",
        desc: "Daily for 7 days",
        xp: 50,
        target: 7,
        unit: "logs",
        current: () => moods7,
        progress: () => Math.min(1, moods7 / 7),
      },
      {
        id: "wk-hydration-40",
        title: "40 glasses of water",
        emoji: "💧",
        desc: "This week",
        xp: 40,
        target: 40,
        unit: "glasses",
        current: () => hydration7,
        progress: () => Math.min(1, hydration7 / 40),
      },
      {
        id: "ms-7-days",
        title: "7 days smoke-free",
        emoji: "🏆",
        desc: "Streak milestone",
        xp: 100,
        target: 7,
        unit: "days",
        current: () => days,
        progress: () => Math.min(1, days / 7),
      },
      {
        id: "ms-30-days",
        title: "30 days smoke-free",
        emoji: "👑",
        desc: "Long-term win",
        xp: 200,
        target: 30,
        unit: "days",
        current: () => days,
        progress: () => Math.min(1, days / 30),
      },
    ];
  }, [user]);

  const load = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data: active } = await supabase
      .from("challenges").select("*")
      .lte("start_date", today).gte("end_date", today)
      .order("start_date", { ascending: false }).limit(1).maybeSingle();
    setFeatured(active as any);

    if (active) {
      const { count } = await supabase.from("challenge_participants").select("*", { count: "exact", head: true }).eq("challenge_id", active.id);
      setParticipantCount(count ?? 0);
      const { data: mine } = await supabase.from("challenge_participants").select("*").eq("challenge_id", active.id).eq("user_id", userId).maybeSingle();
      setMyPart(mine as any);
    }

    const { data: pastList } = await supabase.from("challenges").select("*").lt("end_date", today).order("end_date", { ascending: false }).limit(6);
    setPast((pastList ?? []) as any);

    const { data: xpRow } = await supabase.from("user_xp").select("total_xp").eq("user_id", userId).maybeSingle();
    setMyXp(xpRow?.total_xp ?? 0);

    // Hydrate completed set from xp_events (to mark tiles as done across reloads)
    const { data: events } = await supabase
      .from("xp_events")
      .select("dedupe_key")
      .eq("user_id", userId)
      .like("dedupe_key", "daily_challenge:auto-%");
    setCompleted(new Set((events ?? []).map((e: any) => e.dedupe_key.replace("daily_challenge:", ""))));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // Auto-complete tracked challenges when threshold reached
  useEffect(() => {
    if (!user || autoChallenges.length === 0) return;
    autoChallenges.forEach(async (c) => {
      const week = todayKey().slice(0, 7); // group monthly
      const dedupe = `auto-${c.id}-${week}`;
      if (completed.has(dedupe)) return;
      if (c.progress() >= 1) {
        const granted = await awardXp("daily_challenge", { extra: dedupe });
        if (granted > 0) {
          toast.success(`🏅 ${c.title} complete! +${c.xp} XP`);
          setCompleted((s) => new Set(s).add(dedupe));
          load();
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoChallenges, completed]);

  const join = async () => {
    if (!featured) return;
    const { error } = await supabase.from("challenge_participants").insert({ challenge_id: featured.id, user_id: userId });
    if (error) { toast.error("Could not join"); return; }
    awardXp("challenge_joined", { silent: true });
    toast.success("You're in! 🔥");
    load();
  };

  const lvl = levelFromXp(myXp);
  const daysLeft = featured ? Math.max(0, Math.ceil((new Date(featured.end_date).getTime() - Date.now()) / 86400000)) : 0;
  const progressPct = featured?.target_participants ? Math.min(100, (participantCount / featured.target_participants) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* User level chip */}
      <div className="smoxit-card flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{lvl.emoji}</span>
          <div>
            <p className="text-xs font-bold">{lvl.name}</p>
            <p className="text-[10px] text-muted-foreground">Level {lvl.level} · {myXp} XP</p>
          </div>
        </div>
        <Trophy className="h-4 w-4 text-accent" />
      </div>

      {/* Featured global challenge */}
      {featured && (
        <div className="rounded-2xl bg-gradient-hero p-4 text-primary-foreground">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-accent">🌍 Global · {daysLeft}d left</p>
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">{participantCount.toLocaleString()} joined</span>
          </div>
          <p className="mt-1 font-display text-base font-black leading-tight">{featured.title}</p>
          <p className="text-[11px] opacity-80 line-clamp-2">{featured.description}</p>
          <Progress value={progressPct} className="mt-2 h-1 bg-white/10" />
          <Button onClick={join} disabled={!!myPart} size="sm" className="mt-3 h-8 w-full bg-accent text-xs font-bold text-accent-foreground hover:bg-accent-glow">
            {myPart ? "✓ You're in" : "Join"}
          </Button>
        </div>
      )}

      {/* Auto-tracked challenge tiles */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your challenges</p>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Sparkles className="h-3 w-3" /> auto-tracked</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {autoChallenges.map((c) => {
            const week = todayKey().slice(0, 7);
            const isDone = completed.has(`auto-${c.id}-${week}`) || c.progress() >= 1;
            const pct = c.progress() * 100;
            return (
              <div key={c.id} className={`relative rounded-2xl border p-3 ${isDone ? "border-accent bg-accent/10" : "border-border bg-card"}`}>
                <div className="flex items-start justify-between">
                  <span className="text-xl">{c.emoji}</span>
                  {isDone ? <CheckCircle2 className="h-4 w-4 text-accent" /> : <span className="text-[10px] font-bold text-accent">+{c.xp}</span>}
                </div>
                <p className="mt-1 text-xs font-bold leading-tight">{c.title}</p>
                <p className="text-[10px] text-muted-foreground">{c.desc}</p>
                <div className="mt-2">
                  <Progress value={pct} className="h-1" />
                  <p className="mt-1 text-[10px] text-muted-foreground">{Math.min(c.current(), c.target)}/{c.target} {c.unit}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {past.length > 0 && (
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Past challenges</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {past.map((p) => (
              <div key={p.id} className="shrink-0 w-44 rounded-xl border border-border bg-card p-3">
                <p className="text-xs font-bold truncate">{p.title}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">Ended {new Date(p.end_date).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
