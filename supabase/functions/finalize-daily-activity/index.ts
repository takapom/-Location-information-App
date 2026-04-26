import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json" };

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: jsonHeaders });
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: jsonHeaders });
  }

  const { dailyActivityId } = await req.json().catch(() => ({ dailyActivityId: undefined }));
  if (typeof dailyActivityId !== "string" || dailyActivityId.length === 0) {
    return new Response(JSON.stringify({ error: "invalid_payload" }), { status: 400, headers: jsonHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), { status: 500, headers: jsonHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authorization } } });

  const { data, error } = await supabase.rpc("finalize_daily_activity", {
    p_daily_activity_id: dailyActivityId
  });

  if (error) {
    return new Response(JSON.stringify({ error: "finalize_failed", message: error.message }), { status: 400, headers: jsonHeaders });
  }

  return new Response(JSON.stringify({ data }), { status: 200, headers: jsonHeaders });
});
