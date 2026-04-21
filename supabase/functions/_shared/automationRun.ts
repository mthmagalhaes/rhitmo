import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

export interface AutomationRunHandle {
  id: string;
  finish: (status: 'success' | 'partial' | 'error', items: number, error?: string) => Promise<void>;
}

/**
 * Starts an automation_runs row. Returns a handle to call finish() when done.
 * Always swallows DB errors — automation must run even if observability fails.
 */
export async function startAutomationRun(
  admin: SupabaseClient,
  jobName: string,
  metadata: Record<string, unknown> = {},
): Promise<AutomationRunHandle> {
  let runId = '';
  try {
    const { data, error } = await admin
      .from('automation_runs')
      .insert({ job_name: jobName, status: 'running', metadata })
      .select('id')
      .single();
    if (!error && data) runId = data.id as string;
  } catch (e) {
    console.error('[automationRun] start failed', e);
  }

  return {
    id: runId,
    async finish(status, items, error) {
      if (!runId) return;
      try {
        await admin
          .from('automation_runs')
          .update({
            finished_at: new Date().toISOString(),
            status,
            items_processed: items,
            error: error ?? null,
          })
          .eq('id', runId);
      } catch (e) {
        console.error('[automationRun] finish failed', e);
      }
    },
  };
}

export function getAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}
