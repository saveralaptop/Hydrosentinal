// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function computeStatus(ph: number, tds: number, turbidity: number): "SAFE" | "NOT SAFE" {
  if (ph < 6.5 || ph > 8.5 || tds > 1000 || turbidity > 25) return "NOT SAFE";
  return "SAFE";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const ph = Number(body.ph);
    const tds = Number(body.tds);
    const turbidity = Number(body.turbidity);
    const temperature = Number(body.temperature);

    if ([ph, tds, turbidity, temperature].some((v) => !Number.isFinite(v))) {
      return new Response(JSON.stringify({ error: "Invalid sensor values" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const status =
      body.status === "SAFE" || body.status === "NOT SAFE"
        ? body.status
        : computeStatus(ph, tds, turbidity);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("readings")
      .insert({ ph, tds, turbidity, temperature, status })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, reading: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("data error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
