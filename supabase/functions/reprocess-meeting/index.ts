import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  fetchAllRecallParticipants,
  matchMembersToParticipants,
  type RecallParticipant,
} from "../_shared/recallParticipants.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const recallApiKey = Deno.env.get('RECALL_API_KEY');

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const isServiceRole = authHeader === `Bearer ${supabaseServiceKey}`;
    let userId: string | null = null;
    if (!isServiceRole) {
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await authClient.auth.getUser();
      if (!user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      userId = user.id;
    }

    const body = await req.json();
    const { recallBotId } = body;

    if (!recallBotId) {
      return new Response(
        JSON.stringify({ success: false, error: 'recallBotId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!recallApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'RECALL_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase: any = createClient(supabaseUrl, supabaseServiceKey);

    // Find the bot record
    const { data: botRecord, error: findError } = await supabase
      .from('recall_bots')
      .select('*')
      .eq('recall_bot_id', recallBotId)
      .maybeSingle();

    if (findError || !botRecord) {
      return new Response(
        JSON.stringify({ success: false, error: `Bot ${recallBotId} not found` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Verify ownership if not service role
    if (userId && botRecord.user_id !== userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`Reprocessing bot ${recallBotId} (status: ${botRecord.status})...`);

    // Fetch transcript from Recall API v1 bot retrieve → media_shortcuts
    const recallHeaders = { Authorization: `Token ${recallApiKey}` };
    const botResponse = await fetch(
      `https://us-west-2.recall.ai/api/v1/bot/${recallBotId}/`,
      { headers: recallHeaders },
    );

    if (!botResponse.ok) {
      const errText = await botResponse.text();
      console.error(`Failed to retrieve bot: ${botResponse.status} ${errText}`);
      return new Response(
        JSON.stringify({ success: false, error: `Recall API error: ${botResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const botData = await botResponse.json();
    const recordings = botData.recordings;

    if (!recordings || recordings.length === 0) {
      // Mark bot as unrecoverable so the user can dismiss it
      await supabase
        .from('recall_bots')
        .update({
          status: 'unrecoverable',
          error_message: 'O bot entrou na chamada mas nunca chegou a gravar (provavelmente ficou na sala de espera). Não há transcrição para recuperar.',
        })
        .eq('id', botRecord.id);
      return new Response(
        JSON.stringify({
          success: false,
          unrecoverable: true,
          error: 'O bot não chegou a gravar essa reunião (ficou na sala de espera ou foi removido antes do início). Não há transcrição disponível na Recall para recuperar.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const transcriptShortcut = recordings[0]?.media_shortcuts?.transcript;
    if (!transcriptShortcut || !transcriptShortcut.data?.download_url) {
      const status = transcriptShortcut?.status?.code || transcriptShortcut?.status || 'missing';
      const isProcessing = ['processing', 'in_progress', 'recording'].includes(String(status));
      if (!isProcessing) {
        await supabase
          .from('recall_bots')
          .update({
            status: 'unrecoverable',
            error_message: `Transcrição não disponível na Recall (status: ${status}).`,
          })
          .eq('id', botRecord.id);
      }
      return new Response(
        JSON.stringify({
          success: false,
          unrecoverable: !isProcessing,
          error: isProcessing
            ? `A transcrição ainda está sendo processada pela Recall (status: ${status}). Tente novamente em alguns minutos.`
            : `A Recall não tem transcrição disponível para essa reunião (status: ${status}).`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Download transcript
    const downloadUrl = transcriptShortcut.data.download_url;
    console.log(`Downloading transcript from media_shortcuts...`);
    const transcriptResponse = await fetch(downloadUrl);
    if (!transcriptResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to download transcript: ${transcriptResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const transcriptData = await transcriptResponse.json();

    // Build speaker map from transcript data
    const speakerNameMap: Record<number, string> = {};
    if (Array.isArray(transcriptData)) {
      for (const segment of transcriptData) {
        const pid = segment.participant?.id;
        const pname = segment.participant?.name;
        if (pid !== undefined && pname) {
          speakerNameMap[pid] = pname;
        }
      }
    }

    // Format transcript
    const formattedTranscript = formatTranscript(transcriptData, speakerNameMap);

    console.log(`Transcript: ${formattedTranscript.length} chars, ${Object.keys(speakerNameMap).length} speakers`);

    // Fetch participants from Recall (combines legacy + participant_events).
    const participants = await fetchAllRecallParticipants(recallBotId, recallApiKey);

    // Find members for this meeting (now including name-matching against participants)
    const memberIds = await findAllMeetingMembers(
      supabase,
      botRecord.user_id,
      botRecord.meeting_url,
      botRecord.meeting_id,
      botRecord.member_id,
      participants,
    );

    console.log(`Found ${memberIds.length} member(s) (${participants.length} Recall participants seen)`);

    const createdIds: { memberId: string; transcriptId: string; feedbackId: string }[] = [];

    for (const memberId of memberIds) {
      const result = await createTranscriptAndFeedback(
        supabase,
        botRecord.user_id,
        memberId,
        formattedTranscript,
        formattedTranscript,
      );
      if (result) {
        createdIds.push({ memberId, ...result });
      }
    }

    if (memberIds.length === 0) {
      await supabase.from('meeting_transcripts').insert({
        manager_id: botRecord.user_id,
        member_id: null,
        transcript: formattedTranscript,
        processing_status: 'completed',
        leader_notes: 'Transcrição automática via Recall.ai (reprocessada)',
      });
    }

    // Update bot record
    await supabase
      .from('recall_bots')
      .update({
        status: 'done',
        transcript: formattedTranscript,
        transcript_data: { raw_transcript: transcriptData, speaker_map: speakerNameMap },
        meeting_transcript_id: createdIds[0]?.transcriptId || null,
        error_message: null,
      })
      .eq('id', botRecord.id);

    // Trigger analysis for each feedback
    for (const { feedbackId } of createdIds) {
      if (!feedbackId) continue;
      fetch(`${supabaseUrl}/functions/v1/analyze-feedback-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({ feedbackId }),
      }).catch((e) => console.error(`Analysis trigger failed:`, e));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reprocessado com sucesso. ${createdIds.length} feedback(s) criado(s).`,
        feedbacks: createdIds.map(c => ({ memberId: c.memberId, feedbackId: c.feedbackId })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('reprocess-meeting error:', msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

// ── Helpers (same logic as recall-webhook) ─────────────────────────────────

function formatTranscript(
  transcriptData: unknown,
  speakerNameMap: Record<number, string>,
): string {
  if (!Array.isArray(transcriptData)) return JSON.stringify(transcriptData);

  return transcriptData
    .map((segment: { participant?: { id?: number; name?: string }; speaker?: string | number; speaker_id?: number; words: Array<{ text: string }> }) => {
      const speakerName =
        segment.participant?.name ||
        (segment.speaker_id !== undefined && speakerNameMap[segment.speaker_id]
          ? speakerNameMap[segment.speaker_id]
          : typeof segment.speaker === 'string' && segment.speaker
            ? segment.speaker
            : 'Participante');
      const text = segment.words?.map((w: { text: string }) => w.text).join(' ') || '';
      return `**${speakerName}:** ${text}`;
    })
    .join('\n\n');
}

async function findAllMeetingMembers(
  supabase: any,
  userId: string,
  meetingUrl: string,
  meetingId: string | null,
  fallbackMemberId: string | null,
  participants: RecallParticipant[] = [],
): Promise<string[]> {
  const memberIds = new Set<string>();

  if (meetingId) {
    const { data: sourceMeeting } = await supabase
      .from('upcoming_meetings')
      .select('google_event_id')
      .eq('id', meetingId)
      .maybeSingle();

    if (sourceMeeting?.google_event_id) {
      const { data: relatedMeetings } = await supabase
        .from('upcoming_meetings')
        .select('member_id')
        .eq('google_event_id', sourceMeeting.google_event_id)
        .eq('user_id', userId)
        .not('member_id', 'is', null);

      if (relatedMeetings) {
        for (const m of relatedMeetings) {
          if (m.member_id) memberIds.add(m.member_id);
        }
      }
    }
  }

  if (meetingUrl) {
    const { data: urlMatches } = await supabase
      .from('upcoming_meetings')
      .select('member_id')
      .eq('user_id', userId)
      .eq('meet_link', meetingUrl)
      .not('member_id', 'is', null);

    if (urlMatches) {
      for (const m of urlMatches) {
        if (m.member_id) memberIds.add(m.member_id);
      }
    }
  }

  // Name-matching against this leader's team_members
  if (participants.length > 0) {
    try {
      const { data: leaderTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('leader_user_id', userId);
      const teamIds = (leaderTeams ?? []).map((t: { id: string }) => t.id);
      if (teamIds.length > 0) {
        const { data: members } = await supabase
          .from('team_members')
          .select('id, name, email')
          .in('team_id', teamIds);
        const matched = matchMembersToParticipants(participants, members ?? []);
        for (const id of matched) memberIds.add(id);
        console.log(`[reprocess] name-matched ${matched.length} of ${participants.length} participants → ${members?.length ?? 0} candidate members`);
      }
    } catch (e) {
      console.error('[reprocess] name-matching failed:', e);
    }
  }

  if (memberIds.size === 0 && fallbackMemberId) {
    memberIds.add(fallbackMemberId);
  }

  return Array.from(memberIds);
}

async function createTranscriptAndFeedback(
  supabase: any,
  managerId: string,
  memberId: string,
  fullTranscript: string,
  truncatedContent: string,
): Promise<{ transcriptId: string; feedbackId: string } | null> {
  const { data: mt, error: mtError } = await supabase
    .from('meeting_transcripts')
    .insert({
      manager_id: managerId,
      member_id: memberId,
      transcript: fullTranscript,
      processing_status: 'completed',
      leader_notes: 'Transcrição automática via Recall.ai',
    })
    .select('id')
    .single();

  if (mtError || !mt) {
    console.error(`Failed to create transcript for ${memberId}:`, mtError);
    return null;
  }

  const { data: fb, error: fbError } = await supabase
    .from('feedbacks')
    .insert({
      manager_id: managerId,
      member_id: memberId,
      content: truncatedContent,
      type: 'neutral',
      source: 'recall_bot',
      title: 'Transcrição de reunião',
      meeting_transcript_id: mt.id,
      visibility: 'private_leader',
    })
    .select('id')
    .single();

  if (fbError || !fb) {
    console.error(`Failed to create feedback for ${memberId}:`, fbError);
    return { transcriptId: mt.id, feedbackId: '' };
  }

  console.log(`Created transcript ${mt.id} + feedback ${fb.id} for member ${memberId}`);
  return { transcriptId: mt.id, feedbackId: fb.id };
}
