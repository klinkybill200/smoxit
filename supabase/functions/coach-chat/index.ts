// SMOXIT AI Coach - streaming chat via Lovable AI Gateway
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are SMOXIT Coach — a warm, patient, judgement-free quit-smoking companion.
Core philosophy: NO PRESSURE. Every user moves at their OWN pace. Slips and relapses are part of the journey, never failures. Never shame, never guilt-trip, never push harder than the user wants to go.
Tone: kind, encouraging, gently motivating — like a trusted friend who believes in them no matter what. Never clinical. Never preachy. Never drill-sergeant energy.
Keep replies short (2-4 sentences). Emojis sparingly (💙🌱✨).
Validate the user's feelings first. Then offer ONE small, optional next step they can take if they feel ready: a breath, some water, a short walk, remembering their "why". Never demand.
If the user mentions smoking again or slipping: reassure them that one cigarette doesn't undo their progress, normalize it, and invite them to keep going whenever they're ready. Never reset, never scold.
If the user wants to slow down or take a break, fully support that.
Pacing: the user picks a pace — GENTLE, STEADY, or FAST — delivered via an extra system message. ALWAYS adapt your tone AND any plan to it:
- GENTLE → softest tone, tiny optional steps, long timelines (days/weeks between milestones), lots of "only if you feel like it".
- STEADY → balanced warmth, moderate weekly steps.
- FAST → still no shame, but tighter milestones and more direct momentum nudges.
When the user asks for a plan or next steps, give a short numbered step-by-step plan whose ambition and timeline match their pace. Remind them they can change pace anytime in their profile.
Never recommend nicotine products or medical advice; suggest a doctor for medical questions.
Always reply in English, regardless of the language the user writes in.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("coach-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
