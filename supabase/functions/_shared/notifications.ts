import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

export type NotificationType =
  | 'weekly_summary'
  | 'pdi_milestone'
  | 'self_reflection'
  | 'hr_alerts'
  | 'member_request_1on1'
  | 'ai_pattern'
  | 'mirror_insight';

export type NotificationChannel = 'off' | 'in_app' | 'email' | 'slack';

const DEFAULT_CHANNELS: Record<NotificationType, NotificationChannel> = {
  weekly_summary: 'email',
  pdi_milestone: 'in_app',
  self_reflection: 'in_app',
  hr_alerts: 'email',
  member_request_1on1: 'in_app',
  ai_pattern: 'in_app',
  mirror_insight: 'in_app',
};

export interface DispatchPayload {
  /** Recipient auth.users id */
  userId: string;
  notificationType: NotificationType;
  /** In-app nudge fields (always created when channel resolves to in_app or as fallback) */
  inApp: {
    leaderId?: string; // If user is a leader, fill leader_nudges.leader_id with their id
    memberId?: string;
    nudgeType: string;
    message: string;
    actionUrl?: string;
    severity?: 'info' | 'warning' | 'critical';
  };
  /** Email fields (only used if channel resolves to 'email') */
  email?: {
    templateName: string;
    templateData: Record<string, unknown>;
  };
  /** Slack fields (only used if channel resolves to 'slack') */
  slack?: {
    text: string;
    blocks?: unknown[];
  };
}

export interface DispatchResult {
  channel: NotificationChannel;
  delivered: boolean;
  error?: string;
}

async function getUserChannel(
  admin: SupabaseClient,
  userId: string,
  type: NotificationType,
): Promise<NotificationChannel> {
  try {
    const { data } = await admin
      .from('user_notification_preferences')
      .select('channel')
      .eq('user_id', userId)
      .eq('notification_type', type)
      .maybeSingle();
    if (data?.channel) return data.channel as NotificationChannel;
  } catch (e) {
    console.error('[notifications] preference lookup failed', e);
  }
  return DEFAULT_CHANNELS[type];
}

async function getUserEmail(admin: SupabaseClient, userId: string): Promise<string | null> {
  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}

async function createInAppNudge(
  admin: SupabaseClient,
  userId: string,
  payload: DispatchPayload,
): Promise<void> {
  await admin.from('leader_nudges').insert({
    leader_id: payload.inApp.leaderId ?? userId,
    member_id: payload.inApp.memberId ?? null,
    nudge_type: payload.inApp.nudgeType,
    message: payload.inApp.message,
    action_url: payload.inApp.actionUrl ?? null,
    severity: payload.inApp.severity ?? 'info',
  });
}

async function sendEmail(
  admin: SupabaseClient,
  to: string,
  templateName: string,
  templateData: Record<string, unknown>,
): Promise<void> {
  await sendAppEmail(templateName, to, { templateData });
}

async function sendSlack(
  admin: SupabaseClient,
  userId: string,
  text: string,
  blocks?: unknown[],
): Promise<boolean> {
  const slackToken = Deno.env.get('SLACK_BOT_TOKEN');
  if (!slackToken) return false;

  const { data: link } = await admin
    .from('slack_integrations')
    .select('slack_user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!link?.slack_user_id) return false;

  const openRes = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${slackToken}` },
    body: JSON.stringify({ users: link.slack_user_id }),
  });
  const openData = await openRes.json();
  if (!openData?.ok || !openData?.channel?.id) return false;

  const postRes = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${slackToken}` },
    body: JSON.stringify({ channel: openData.channel.id, text, blocks }),
  });
  const postData = await postRes.json();
  return !!postData?.ok;
}

/**
 * Dispatches a notification to a user respecting their channel preference.
 * Always falls back to in_app on failure of email/slack to ensure the user
 * is not silently dropped from a job.
 */
export async function dispatchNotification(
  admin: SupabaseClient,
  payload: DispatchPayload,
): Promise<DispatchResult> {
  const channel = await getUserChannel(admin, payload.userId, payload.notificationType);

  if (channel === 'off') {
    return { channel, delivered: false };
  }

  try {
    if (channel === 'email' && payload.email) {
      const email = await getUserEmail(admin, payload.userId);
      if (email) {
        await sendEmail(admin, email, payload.email.templateName, payload.email.templateData);
        return { channel, delivered: true };
      }
    }

    if (channel === 'slack' && payload.slack) {
      const ok = await sendSlack(admin, payload.userId, payload.slack.text, payload.slack.blocks);
      if (ok) return { channel, delivered: true };
    }

    // Fallback / explicit in_app
    await createInAppNudge(admin, payload.userId, payload);
    return { channel: 'in_app', delivered: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[notifications] dispatch failed', msg);
    // Final fallback: try in_app
    try {
      await createInAppNudge(admin, payload.userId, payload);
      return { channel: 'in_app', delivered: true, error: msg };
    } catch (e2) {
      return { channel, delivered: false, error: msg };
    }
  }
}
