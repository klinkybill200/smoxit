// AI-personalized craving rescue tip via Lovable AI Gateway
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `You are SMOXIT's AI craving companion. The user is fighting a cigarette craving right now.
Philosophy: NO PRESSURE, NO SHAME. The user moves at their own pace. If they slip, that's ok — it's part of the journey.
Give ONE gentle, doable rescue suggestion they could try in the next 60 seconds — never a command.
Tone: kind, warm, patient — like a caring friend, not a drill sergeant.
Format: 1–2 short sentences. Reference their trigger and "why" if provided. Always English. Use 1 emoji max (💙🌱✨). Never preachy. Never medical advice.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { trigger, whyQuit, daysSmokeFree, pace } = await req.json();
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY missing");

    const paceNote =
      pace === "gentle"
        ? "User chose a GENTLE pace — be extra soft, fully optional, no urgency."
        : pace === "fast"
        ? "User chose a FAST pace — still no pressure, but a slightly more direct nudge is welcome."
        : "User chose a STEADY pace — balanced, warm, no pressure.";

    const userMsg = `Trigger: ${trigger ?? "unknown"}. Days smoke-free: ${daysSmokeFree ?? 0}. My "why": ${whyQuit ?? "n/a"}. ${paceNote} Give me ONE rescue action right now.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!r.ok) {
      if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "Credits" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await r.text();
      console.error("ai-craving-tip gateway error", r.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const j = await r.json();
    const tip = j.choices?.[0]?.message?.content?.trim() ?? "Take 3 slow breaths. You've got this. 💪";
    return new Response(JSON.stringify({ tip }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-craving-tip error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
