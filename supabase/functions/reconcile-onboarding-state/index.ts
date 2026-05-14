// Sprint 3.5 — Nightly reconciliation of onboarding state.
// - Auto-claim orphan team_members (NULL linked_user_id) by email match.
// - Mark stale pending invites (>14 days) as expired.
// - Log everything in onboarding_reconciliation_log.
//
// Triggered by pg_cron at 03:00 UTC. Service role only.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface RunSummary {
  claimed: number;
  expired: number;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const summary: RunSummary = { claimed: 0, expired: 0, errors: [] };
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // 1. Auto-claim orphan team_members by email match
  try {
    const { data: orphans, error: orphansErr } = await admin
      .from('team_members')
      .select('id, email')
      .is('linked_user_id', null)
      .not('email', 'is', null)
      .limit(500);

    if (orphansErr) throw orphansErr;

    for (const orphan of orphans ?? []) {
      if (!orphan.email) continue;
      try {
        const { data: usersList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const match = usersList?.users.find(
          (u) => u.email?.toLowerCase() === orphan.email!.toLowerCase(),
        );
        if (!match) continue;

        const { error: claimErr } = await admin.rpc('claim_team_member_by_email', {
          p_user_id: match.id,
          p_email: orphan.email,
        });
        if (claimErr) {
          summary.errors.push(`claim ${orphan.id}: ${claimErr.message}`);
          continue;
        }
        summary.claimed++;
      } catch (err) {
        summary.errors.push(`orphan ${orphan.id}: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    summary.errors.push(`orphan-scan: ${(err as Error).message}`);
  }

  // 2. Expire stale pending invites (>14 days)
  try {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: stale, error: staleErr } = await admin
      .from('team_members')
      .update({ invite_status: 'expired' })
      .eq('invite_status', 'pending')
      .is('linked_user_id', null)
      .lt('created_at', fourteenDaysAgo.toISOString())
      .select('id');

    if (staleErr) throw staleErr;
    summary.expired = stale?.length ?? 0;
  } catch (err) {
    summary.errors.push(`expire-stale: ${(err as Error).message}`);
  }

  // 3. Log run
  try {
    await admin.from('onboarding_reconciliation_log').insert({
      claimed_count: summary.claimed,
      expired_count: summary.expired,
      errors: summary.errors,
      ran_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[reconcile] failed to log:', err);
  }

  return new Response(JSON.stringify(summary), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
});
