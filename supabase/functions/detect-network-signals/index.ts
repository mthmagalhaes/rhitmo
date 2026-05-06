// Sprint 14 — Detects derived signals from team_network_edges.
// Runs daily after build-team-graph. Inserts into network_signals (dedup by day).
//
// Signal types:
//   - isolate          : member with sum(weight_total) < ISOLATE_THRESHOLD on 30d window
//   - super_connector  : top-N members by aggregated weight (info, not attention)
//   - pattern_drop     : drop > 50% comparing 30d vs (60d - 30d)
//   - pattern_spike    : rise > 100% comparing 30d vs (60d - 30d)
//
// Auth: requires either service-role key OR a super-admin user JWT.
// Trigger workspace_id optional — if omitted, processes all active workspaces.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ISOLATE_THRESHOLD = 1.5; // sum of weights below this on 30d = "quiet"
const SUPER_CONNECTOR_TOP_N = 5;
const DROP_PCT = 0.5; // 50%
const SPIKE_PCT = 1.0; // 100%

interface EdgeRow {
  workspace_id: string;
  member_a_id: string;
  member_b_id: string;
  weight_total: number;
  window_days: number;
}

interface MemberRow {
  id: string;
  name: string | null;
  team_id: string;
}

interface TeamRow {
  id: string;
  workspace_id: string;
  leader_user_id: string;
}

interface SignalInsert {
  workspace_id: string;
  leader_user_id: string;
  member_id: string;
  signal_type: 'isolate' | 'super_connector' | 'pattern_drop' | 'pattern_spike';
  window_days: number;
  severity: 'info' | 'watch' | 'attention';
  payload: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth: super-admin user OR service-role bearer
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === serviceRoleKey;

    if (!isServiceRole) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) {
        return json({ error: "Unauthorized" }, 401);
      }
      const { data: isAdmin } = await userClient.rpc("is_admin");
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const targetWorkspaceId = body?.workspace_id as string | undefined;

    // Fetch teams (workspace + leader mapping)
    const teamsQuery = admin.from("teams").select("id, workspace_id, leader_user_id");
    const { data: teams, error: teamsErr } = targetWorkspaceId
      ? await teamsQuery.eq("workspace_id", targetWorkspaceId)
      : await teamsQuery;
    if (teamsErr) throw teamsErr;
    if (!teams || teams.length === 0) {
      return json({ ok: true, signals_inserted: 0, workspaces_processed: 0 });
    }

    const teamsByWorkspace = new Map<string, TeamRow[]>();
    for (const t of teams as TeamRow[]) {
      if (!teamsByWorkspace.has(t.workspace_id)) teamsByWorkspace.set(t.workspace_id, []);
      teamsByWorkspace.get(t.workspace_id)!.push(t);
    }

    let totalInserted = 0;
    const signals: SignalInsert[] = [];

    for (const [workspaceId, wsTeams] of teamsByWorkspace.entries()) {
      // Members of this workspace's teams
      const teamIds = wsTeams.map((t) => t.id);
      const { data: members } = await admin
        .from("team_members")
        .select("id, name, team_id")
        .in("team_id", teamIds);
      if (!members || members.length === 0) continue;

      const leaderByMember = new Map<string, string>();
      for (const m of members as MemberRow[]) {
        const team = wsTeams.find((t) => t.id === m.team_id);
        if (team) leaderByMember.set(m.id, team.leader_user_id);
      }

      // Edges in this workspace, both windows
      const { data: edges30 } = await admin
        .from("team_network_edges")
        .select("workspace_id, member_a_id, member_b_id, weight_total, window_days")
        .eq("workspace_id", workspaceId)
        .eq("window_days", 30);

      const { data: edges60 } = await admin
        .from("team_network_edges")
        .select("workspace_id, member_a_id, member_b_id, weight_total, window_days")
        .eq("workspace_id", workspaceId)
        .eq("window_days", 60);

      const sum30 = aggregateByMember((edges30 ?? []) as EdgeRow[]);
      const sum60 = aggregateByMember((edges60 ?? []) as EdgeRow[]);

      // Detect per member
      for (const m of members as MemberRow[]) {
        const leaderUserId = leaderByMember.get(m.id);
        if (!leaderUserId) continue;

        const w30 = sum30.get(m.id) ?? 0;
        const w60 = sum60.get(m.id) ?? 0;
        // Previous 30d window = total 60d minus recent 30d (approx)
        const wPrev = Math.max(0, w60 - w30);

        // 1) Isolate
        if (w30 < ISOLATE_THRESHOLD) {
          signals.push({
            workspace_id: workspaceId,
            leader_user_id: leaderUserId,
            member_id: m.id,
            signal_type: "isolate",
            window_days: 30,
            severity: "watch",
            payload: { weight_30d: w30, weight_prev_30d: wPrev, threshold: ISOLATE_THRESHOLD },
          });
        }

        // 2) Pattern drop (only if prev had meaningful baseline)
        if (wPrev >= ISOLATE_THRESHOLD && w30 < wPrev * (1 - DROP_PCT)) {
          const deltaPct = wPrev > 0 ? (w30 - wPrev) / wPrev : 0;
          signals.push({
            workspace_id: workspaceId,
            leader_user_id: leaderUserId,
            member_id: m.id,
            signal_type: "pattern_drop",
            window_days: 30,
            severity: "watch",
            payload: {
              weight_30d: w30,
              weight_prev_30d: wPrev,
              delta_pct: Number(deltaPct.toFixed(3)),
            },
          });
        }

        // 3) Pattern spike (info-level, positive)
        if (wPrev >= ISOLATE_THRESHOLD && w30 > wPrev * (1 + SPIKE_PCT)) {
          const deltaPct = wPrev > 0 ? (w30 - wPrev) / wPrev : 0;
          signals.push({
            workspace_id: workspaceId,
            leader_user_id: leaderUserId,
            member_id: m.id,
            signal_type: "pattern_spike",
            window_days: 30,
            severity: "info",
            payload: {
              weight_30d: w30,
              weight_prev_30d: wPrev,
              delta_pct: Number(deltaPct.toFixed(3)),
            },
          });
        }
      }

      // 4) Super-connectors (top N by 30d sum)
      const ranked = [...sum30.entries()]
        .filter(([memberId]) => leaderByMember.has(memberId))
        .sort((a, b) => b[1] - a[1])
        .slice(0, SUPER_CONNECTOR_TOP_N);

      for (const [memberId, totalWeight] of ranked) {
        const leaderUserId = leaderByMember.get(memberId)!;
        signals.push({
          workspace_id: workspaceId,
          leader_user_id: leaderUserId,
          member_id: memberId,
          signal_type: "super_connector",
          window_days: 30,
          severity: "info",
          payload: { weight_30d: totalWeight, rank: ranked.findIndex(([id]) => id === memberId) + 1 },
        });
      }
    }

    // Bulk insert with onConflict do nothing (dedup by unique index per day)
    if (signals.length > 0) {
      // Insert in chunks of 500 to be safe
      for (let i = 0; i < signals.length; i += 500) {
        const chunk = signals.slice(i, i + 500);
        const { error: insertErr } = await admin
          .from("network_signals")
          .upsert(chunk, {
            onConflict: "leader_user_id,member_id,signal_type,window_days,detected_on",
            ignoreDuplicates: true,
          });
        if (insertErr) {
          console.error("[detect-network-signals] insert error:", insertErr);
        } else {
          totalInserted += chunk.length;
        }
      }
    }

    return json({
      ok: true,
      workspaces_processed: teamsByWorkspace.size,
      signals_proposed: signals.length,
      signals_inserted: totalInserted,
    });
  } catch (e) {
    console.error("detect-network-signals error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function aggregateByMember(edges: EdgeRow[]): Map<string, number> {
  const sums = new Map<string, number>();
  for (const e of edges) {
    sums.set(e.member_a_id, (sums.get(e.member_a_id) ?? 0) + Number(e.weight_total));
    sums.set(e.member_b_id, (sums.get(e.member_b_id) ?? 0) + Number(e.weight_total));
  }
  return sums;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
