import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Extract meeting link from multiple sources in a Google Calendar event */
function extractMeetLink(event: Record<string, unknown>): string | null {
  // 1. hangoutLink (most common for Google Meet)
  if (event.hangoutLink) return event.hangoutLink as string;

  // 2. conferenceData.entryPoints (Zoom, Teams, Meet, etc.)
  const confData = event.conferenceData as { entryPoints?: Array<{ entryPointType: string; uri: string }> } | undefined;
  if (confData?.entryPoints) {
    const videoEntry = confData.entryPoints.find(
      (ep) => ep.entryPointType === "video" && ep.uri
    );
    if (videoEntry) return videoEntry.uri;
  }

  // 3. Fallback: scan location and description for known patterns
  const urlPattern = /https?:\/\/[^\s<>"]+(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com)[^\s<>"]*/i;
  for (const field of [event.location, event.description]) {
    if (typeof field === "string") {
      const match = field.match(urlPattern);
      if (match) return match[0];
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const RECALL_API_KEY = Deno.env.get("RECALL_API_KEY");

  try {
    // ── Authenticate user ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !authUser) {
      console.error("Auth failed:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authUser.id;
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Fetch Google token ──
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (tokenError || !tokenData) {
      // Return graceful empty response instead of 404 to avoid frontend crashes
      return new Response(JSON.stringify({ meetings: [], not_connected: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = tokenData.access_token;
    const autoTranscribe = tokenData.auto_transcribe === true;

    // ── Refresh if expired ──
    if (tokenData.token_expiry && new Date(tokenData.token_expiry) < new Date()) {
      if (!tokenData.refresh_token) {
        await supabaseAdmin.from("google_calendar_tokens").delete().eq("user_id", userId);
        return new Response(JSON.stringify({ error: "Token expired, please reconnect" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[sync] Refreshing expired token for user ${userId}`);

      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: tokenData.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      const refreshData = await refreshResponse.json();

      if (!refreshResponse.ok || !refreshData.access_token) {
        console.error("[sync] Refresh failed:", refreshData);
        await supabaseAdmin.from("google_calendar_tokens").delete().eq("user_id", userId);
        return new Response(JSON.stringify({ error: "Token refresh failed, please reconnect" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      accessToken = refreshData.access_token;
      const newExpiry = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();

      await supabaseAdmin
        .from("google_calendar_tokens")
        .update({
          access_token: accessToken,
          token_expiry: newExpiry,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      console.log(`[sync] Token refreshed successfully`);
    }

    // ── Fetch Google Calendar events (next 48h) with pagination ──
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const allEvents: Array<Record<string, unknown>> = [];
    let pageToken: string | null = null;

    do {
      const calParams = new URLSearchParams({
        timeMin: now.toISOString(),
        timeMax: in48h.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "50",
      });
      if (pageToken) calParams.set("pageToken", pageToken);

      const eventsResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${calParams}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!eventsResponse.ok) {
        const errText = await eventsResponse.text();
        console.error("[sync] Calendar API error:", errText);
        return new Response(JSON.stringify({ error: "Failed to fetch calendar events" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const eventsData = await eventsResponse.json();
      const items = (eventsData.items || []) as Array<Record<string, unknown>>;
      allEvents.push(...items);
      pageToken = eventsData.nextPageToken || null;
    } while (pageToken);

    console.log(`[sync] Fetched ${allEvents.length} events from Google Calendar`);

    // ── Fetch ALL team members across every team this user leads ──
    // Include linked_user_id so we can deduplicate when the same person has
    // multiple team_members records (e.g. Camila with duplicate row).
    const { data: members } = await supabaseAdmin
      .from("team_members")
      .select("id, name, role, email, linked_user_id, teams!inner(leader_user_id)")
      .eq("teams.leader_user_id", userId)
      .not("email", "is", null);

    if (!members || members.length === 0) {
      console.log(`[sync] No team members found for leader ${userId}`);
      return new Response(JSON.stringify({ meetings: [], debug: { events_found: allEvents.length, reason: "no_members" } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build normalized email lookup (lowercase, trim). When duplicates exist,
    // prefer the record that already has linked_user_id set.
    const membersByEmail = new Map<string, { id: string; name: string; role: string; linked_user_id: string | null }>();
    for (const m of members) {
      if (!m.email) continue;
      const key = m.email.toLowerCase().trim();
      const existing = membersByEmail.get(key);
      if (!existing || (!existing.linked_user_id && m.linked_user_id)) {
        membersByEmail.set(key, { id: m.id, name: m.name, role: m.role, linked_user_id: m.linked_user_id });
      }
    }

    const leaderEmail = (authUser.email || "").toLowerCase().trim();
    console.log(`[sync] Loaded ${membersByEmail.size} team members with emails: ${[...membersByEmail.keys()].join(", ")}`);

    // ── Match events to members and upsert ──
    const matchedMeetings: Array<{
      id?: string;
      title: string;
      start_time: string;
      end_time: string | null;
      meet_link: string | null;
      member_id: string;
      member_name: string;
      member_role: string;
    }> = [];

    let eventsSkippedNoAttendees = 0;
    let eventsSkippedNoMatch = 0;

    for (const event of allEvents) {
      const attendees: Array<{ email: string; displayName?: string }> = (event.attendees as Array<{ email: string; displayName?: string }>) || [];
      const startObj = event.start as { dateTime?: string; date?: string } | undefined;
      const endObj = event.end as { dateTime?: string; date?: string } | undefined;
      const startTime = startObj?.dateTime || startObj?.date;
      const endTime = endObj?.dateTime || endObj?.date;

      if (!startTime) continue;

      // Also consider the organizer as a potential match
      const organizer = event.organizer as { email?: string; displayName?: string } | undefined;
      const allParticipants = [...attendees];
      if (organizer?.email && !allParticipants.some(a => a.email?.toLowerCase() === organizer.email?.toLowerCase())) {
        allParticipants.push({ email: organizer.email, displayName: organizer.displayName });
      }

      if (allParticipants.length === 0) {
        eventsSkippedNoAttendees++;
        continue;
      }

      let foundMatch = false;
      for (const attendee of allParticipants) {
        const email = attendee.email?.toLowerCase().trim();
        if (!email) continue;
        const member = membersByEmail.get(email);
        if (!member) continue;

        foundMatch = true;
        const meetLink = extractMeetLink(event);

        const { data: upserted } = await supabaseAdmin
          .from("upcoming_meetings")
          .upsert(
            {
              user_id: userId,
              member_id: member.id,
              google_event_id: event.id as string,
              title: (event.summary as string) || "Reunião",
              start_time: startTime,
              end_time: endTime || null,
              meet_link: meetLink,
              attendees: JSON.stringify(allParticipants.map((a) => a.email)),
              synced_at: new Date().toISOString(),
            },
            { onConflict: "user_id,google_event_id,member_id" }
          )
          .select("id")
          .single();

        matchedMeetings.push({
          id: upserted?.id,
          title: (event.summary as string) || "Reunião",
          start_time: startTime,
          end_time: endTime || null,
          meet_link: meetLink,
          member_id: member.id,
          member_name: member.name,
          member_role: member.role,
        });
      }

      if (!foundMatch) {
        eventsSkippedNoMatch++;
        // Log first few unmatched events for debugging
        if (eventsSkippedNoMatch <= 5) {
          const participantEmails = allParticipants.map(a => a.email?.toLowerCase()).filter(Boolean);
          console.log(`[sync] No match for "${event.summary}" — attendees: ${participantEmails.join(", ")}`);
        }
      }
    }

    console.log(`[sync] Results: ${matchedMeetings.length} matched, ${eventsSkippedNoAttendees} no attendees, ${eventsSkippedNoMatch} no member match`);

    // ── Auto-schedule Recall bots (2 min before meeting) ──
    if (autoTranscribe && RECALL_API_KEY) {
      const autoScheduled: string[] = [];

      for (const meeting of matchedMeetings) {
        if (!meeting.meet_link || !meeting.id) continue;

        // Dedup by meeting_id AND meeting_url (fallback for recurring meetings with same link)
        const { data: existingByMeetingId } = await supabaseAdmin
          .from("recall_bots")
          .select("id")
          .eq("user_id", userId)
          .eq("meeting_id", meeting.id)
          .not("status", "eq", "error")
          .maybeSingle();

        if (existingByMeetingId) continue;

        // Fallback: check by meeting_url to prevent duplicate bots for same link.
        // IMPORTANT: skipped_no_leader and error MUST block re-scheduling within the
        // meeting window — otherwise we spawn a fresh bot every minute the cron runs,
        // which is what caused the "ghost bots" incident on 13/05.
        const { data: existingByUrl } = await supabaseAdmin
          .from("recall_bots")
          .select("id, attempt_count")
          .eq("user_id", userId)
          .eq("meeting_url", meeting.meet_link)
          .not("status", "eq", "done")
          .gte("scheduled_at", new Date(new Date(meeting.start_time).getTime() - 30 * 60 * 1000).toISOString())
          .lte("scheduled_at", new Date(new Date(meeting.start_time).getTime() + 30 * 60 * 1000).toISOString())
          .maybeSingle();

        if (existingByUrl) {
          console.log(`[sync] Bot already exists in window for URL ${meeting.meet_link}, skipping`);
          continue;
        }

        // Hard cap: max 2 attempts for the same meeting_id within 24h
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: recentAttempts } = await supabaseAdmin
          .from("recall_bots")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("meeting_id", meeting.id)
          .gte("created_at", dayAgo);

        if ((recentAttempts ?? 0) >= 2) {
          console.log(`[sync] Meeting ${meeting.id} already had ${recentAttempts} attempts in 24h, skipping`);
          continue;
        }

        // Join 2 minutes before meeting start
        const joinAt = new Date(new Date(meeting.start_time).getTime() - 2 * 60 * 1000).toISOString();

        try {
          const recallResponse = await fetch("https://us-west-2.recall.ai/api/v1/bot/", {
            method: "POST",
            headers: {
              Authorization: `Token ${RECALL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              meeting_url: meeting.meet_link,
              join_at: joinAt,
              bot_name: "Rhitmo",
              chat: {
                // Apenas 1 mensagem ao entrar. NÃO usar on_participant_join — ele
                // dispara para cada novo participante e gera spam no chat do Meet.
                on_bot_join: {
                  send_to: "everyone",
                  message: "👋 Olá! Sou o assistente Rhitmo. Esta reunião está sendo transcrita para fins de anotações e desenvolvimento profissional. Se tiver dúvidas, fale com seu líder.",
                  pin: true,
                },
              },
              recording_config: {
                transcript: {
                  provider: {
                    recallai_streaming: {
                      mode: "prioritize_accuracy",
                      language_code: "auto",
                    },
                  },
                },
              },
              automatic_leave: {
                waiting_room_timeout: 120,
                in_call_not_recording_timeout: 180,
                noone_joined_timeout: 300,
              },
            }),
          });

          const recallData = await recallResponse.json();

          if (recallResponse.ok && recallData.id) {
            await supabaseAdmin.from("recall_bots").insert({
              user_id: userId,
              meeting_id: meeting.id,
              member_id: meeting.member_id,
              recall_bot_id: recallData.id,
              meeting_url: meeting.meet_link,
              status: "scheduled",
              scheduled_at: joinAt,
              leader_email: authUser.email || null,
            });

            autoScheduled.push(meeting.id);
            console.log(`[sync] Auto-scheduled bot for meeting ${meeting.id}: ${recallData.id}`);
          } else {
            console.error(`[sync] Auto-schedule failed for meeting ${meeting.id}:`, recallData);
          }
        } catch (e) {
          console.error(`[sync] Auto-schedule error for meeting ${meeting.id}:`, e);
        }
      }

      if (autoScheduled.length > 0) {
        console.log(`[sync] Auto-scheduled ${autoScheduled.length} bots`);
      }
    }

    // ── Clean up past meetings ──
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("upcoming_meetings")
      .delete()
      .eq("user_id", userId)
      .lt("start_time", oneHourAgo);

    return new Response(
      JSON.stringify({
        meetings: matchedMeetings,
        debug: {
          events_found: allEvents.length,
          matched: matchedMeetings.length,
          no_attendees: eventsSkippedNoAttendees,
          no_match: eventsSkippedNoMatch,
          team_members_loaded: membersByEmail.size,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[sync] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
