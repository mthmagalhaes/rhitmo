// Sprint 15 — Proactive Peer Feedback
// For strong collaboration edges (last 30d), DM the peer asking for a quick
// note about the subject. Materializes a peer_feedback_requests row and a
// Slack DM with a single button (action_id = peer_fb_open).
//
// Guardrails:
//  - peer must have linked_user_id + slack_integration
//  - same (subject, peer) pair: at most 1 request per 14 days
//  - per workspace: at most MAX_REQUESTS_PER_WORKSPACE_PER_RUN
//  - subject must be on a team with a leader
//  - never DM the leader as a peer

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { validateCronSecret } from "../_shared/cronAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const EDGE_STRENGTH_MIN = 0.3; // weight_total threshold on 30d window
const WINDOW_DAYS = 30;
const MAX_REQUESTS_PER_WORKSPACE_PER_RUN = 5;
const MAX_REQUESTS_PER_RUN = 50;

async function slackPostMessage(channel: string, text: string, blocks: unknown[]) {
  const token = Deno.env.get("SLACK_BOT_TOKEN");
  if (!token) return { ok: false, error: "missing_token" };
  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ channel, text, blocks }),
    });
    return await res.json();
  } catch (err) {
    console.error("[REQUEST_PEER_FB] slack threw", err);
    return { ok: false, error: "fetch_failed" };
  }
}

function buildPeerFbBlocks(requestId: string, subjectName: string) {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `👋 Oi! Vi que você tem colaborado de perto com *${subjectName}* nas últimas semanas.\n` +
          `Quer deixar uma nota rápida pra ajudar no desenvolvimento dele(a)? ` +
          `Leva 30 segundos e fica visível só pra liderança.`,
      },
    },
    { type: "context", elements: [{ type: "mrkdwn", text: "🌀 Rhitmo · feedback contínuo" }] },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          style: "primary",
          text: { type: "plain_text", text: "✍️ Dar feedback rápido" },
          action_id: "peer_fb_open",
          value: requestId,
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Agora não" },
          action_id: "peer_fb_skip",
          value: requestId,
        },
      ],
    },
  ];
}

interface EdgeRow {
  workspace_id: string;
  member_a_id: string;
  member_b_id: string;
  weight_total: number;
}

interface MemberInfo {
  id: string;
  name: string | null;
  team_id: string | null;
  linked_user_id: string | null;
}

interface TeamInfo {
  id: string;
  leader_user_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = validateCronSecret(req);
  if (!auth.valid && auth.error) return auth.error;

  const startedAt = Date.now();
  let created = 0;
  let dmSent = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    // 1) Pull strong edges (30d window)
    const { data: edges, error: edgesErr } = await supabase
      .from("team_network_edges")
      .select("workspace_id,member_a_id,member_b_id,weight_total")
      .eq("window_days", WINDOW_DAYS)
      .gte("weight_total", EDGE_STRENGTH_MIN)
      .order("weight_total", { ascending: false })
      .limit(500);

    if (edgesErr) throw new Error(`edges: ${edgesErr.message}`);
    const edgeList = (edges ?? []) as EdgeRow[];
    if (edgeList.length === 0) {
      return new Response(JSON.stringify({ ok: true, created, dmSent, note: "no edges" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Resolve member info
    const memberIds = Array.from(
      new Set(edgeList.flatMap((e) => [e.member_a_id, e.member_b_id])),
    );
    const { data: members } = await supabase
      .from("team_members")
      .select("id,name,team_id,linked_user_id")
      .in("id", memberIds);

    const memberById = new Map<string, MemberInfo>();
    for (const m of (members ?? []) as MemberInfo[]) memberById.set(m.id, m);

    // 3) Resolve team -> leader
    const teamIds = Array.from(
      new Set((members ?? []).map((m: MemberInfo) => m.team_id).filter(Boolean) as string[]),
    );
    const { data: teams } = await supabase
      .from("teams")
      .select("id,leader_user_id")
      .in("id", teamIds);
    const teamById = new Map<string, TeamInfo>();
    for (const t of (teams ?? []) as TeamInfo[]) teamById.set(t.id, t);

    // 4) Resolve which linked_user_ids have slack
    const userIds = Array.from(
      new Set((members ?? []).map((m: MemberInfo) => m.linked_user_id).filter(Boolean) as string[]),
    );
    const { data: integrations } = await supabase
      .from("slack_integrations")
      .select("user_id, slack_user_id")
      .in("user_id", userIds);
    const slackByUser = new Map<string, string>();
    for (const r of integrations ?? []) {
      if (r.user_id && r.slack_user_id) slackByUser.set(r.user_id, r.slack_user_id);
    }

    // 5) Build candidate (subject, peer) pairs from each edge — try both directions
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const perWorkspace = new Map<string, number>();

    for (const edge of edgeList) {
      if (created >= MAX_REQUESTS_PER_RUN) break;
      const wsCount = perWorkspace.get(edge.workspace_id) ?? 0;
      if (wsCount >= MAX_REQUESTS_PER_WORKSPACE_PER_RUN) continue;

      const a = memberById.get(edge.member_a_id);
      const b = memberById.get(edge.member_b_id);
      if (!a || !b) continue;

      // Try both directions: each can be subject and the other is peer
      for (const [subject, peer] of [[a, b], [b, a]] as [MemberInfo, MemberInfo][]) {
        if (created >= MAX_REQUESTS_PER_RUN) break;
        if ((perWorkspace.get(edge.workspace_id) ?? 0) >= MAX_REQUESTS_PER_WORKSPACE_PER_RUN) break;

        const team = subject.team_id ? teamById.get(subject.team_id) : null;
        if (!team?.leader_user_id) { skipped++; continue; }
        if (!peer.linked_user_id) { skipped++; continue; }
        if (peer.linked_user_id === team.leader_user_id) { skipped++; continue; } // never the leader
        const slackId = slackByUser.get(peer.linked_user_id);
        if (!slackId) { skipped++; continue; }

        // Anti-spam: any request for same (subject, peer) in last 14d?
        const { data: recent } = await supabase
          .from("peer_feedback_requests")
          .select("id")
          .eq("subject_member_id", subject.id)
          .eq("peer_user_id", peer.linked_user_id)
          .gte("created_at", fourteenDaysAgo)
          .limit(1);
        if (recent && recent.length > 0) { skipped++; continue; }

        // Insert request
        const { data: inserted, error: insErr } = await supabase
          .from("peer_feedback_requests")
          .insert({
            workspace_id: edge.workspace_id,
            leader_user_id: team.leader_user_id,
            subject_member_id: subject.id,
            peer_user_id: peer.linked_user_id,
            peer_member_id: peer.id,
            edge_strength_at_request: edge.weight_total,
          })
          .select("id")
          .single();

        if (insErr || !inserted) {
          errors.push(`insert: ${insErr?.message ?? "unknown"}`);
          continue;
        }
        created++;
        perWorkspace.set(edge.workspace_id, (perWorkspace.get(edge.workspace_id) ?? 0) + 1);

        // Send DM
        const blocks = buildPeerFbBlocks(inserted.id, subject.name ?? "um colega");
        const slackResp = await slackPostMessage(
          slackId,
          `Tem 30s pra falar sobre ${subject.name ?? "um colega"}?`,
          blocks,
        );
        if (slackResp?.ok) {
          await supabase
            .from("peer_feedback_requests")
            .update({ sent_at: new Date().toISOString() })
            .eq("id", inserted.id);
          dmSent++;
        } else {
          errors.push(`slack: ${slackResp?.error ?? "unknown"}`);
        }
      }
    }
  } catch (err) {
    console.error("[REQUEST_PEER_FB] threw:", err);
    errors.push(String(err));
  }

  const elapsedMs = Date.now() - startedAt;
  console.log(
    `[REQUEST_PEER_FB] done in ${elapsedMs}ms — created=${created} dm_sent=${dmSent} skipped=${skipped} errors=${errors.length}`,
  );

  return new Response(
    JSON.stringify({ ok: true, elapsed_ms: elapsedMs, created, dm_sent: dmSent, skipped, errors }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
  );
});
