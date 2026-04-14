import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    // Authenticate user
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

    // Fetch token (including auto_transcribe flag)
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: "Calendar not connected" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = tokenData.access_token;
    const autoTranscribe = tokenData.auto_transcribe === true;

    // Refresh if expired
    if (tokenData.token_expiry && new Date(tokenData.token_expiry) < new Date()) {
      if (!tokenData.refresh_token) {
        await supabaseAdmin.from("google_calendar_tokens").delete().eq("user_id", userId);
        return new Response(JSON.stringify({ error: "Token expired, please reconnect" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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
        console.error("Refresh failed:", refreshData);
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
    }

    // Fetch Google Calendar events (next 48h)
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const calParams = new URLSearchParams({
      timeMin: now.toISOString(),
      timeMax: in48h.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "20",
    });

    const eventsResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${calParams}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!eventsResponse.ok) {
      const errText = await eventsResponse.text();
      console.error("Calendar API error:", errText);
      return new Response(JSON.stringify({ error: "Failed to fetch calendar events" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventsData = await eventsResponse.json();
    const events = eventsData.items || [];

    // Fetch team members with email from user's workspace
    const { data: workspace } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();

    if (!workspace) {
      return new Response(JSON.stringify({ meetings: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: members } = await supabaseAdmin
      .from("team_members")
      .select("id, name, role, email, teams!inner(workspace_id)")
      .eq("teams.workspace_id", workspace.id)
      .not("email", "is", null);

    const membersByEmail = new Map<string, { id: string; name: string; role: string }>();
    for (const m of members || []) {
      if (m.email) {
        membersByEmail.set(m.email.toLowerCase(), { id: m.id, name: m.name, role: m.role });
      }
    }

    // Match events to members and upsert
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

    for (const event of events) {
      const attendees: Array<{ email: string; displayName?: string }> = event.attendees || [];
      const startTime = event.start?.dateTime || event.start?.date;
      const endTime = event.end?.dateTime || event.end?.date;

      if (!startTime) continue;

      for (const attendee of attendees) {
        const email = attendee.email?.toLowerCase();
        if (!email) continue;
        const member = membersByEmail.get(email);
        if (!member) continue;

        const meetLink = event.hangoutLink || null;

        const { data: upserted } = await supabaseAdmin
          .from("upcoming_meetings")
          .upsert(
            {
              user_id: userId,
              member_id: member.id,
              google_event_id: event.id,
              title: event.summary || "Reunião",
              start_time: startTime,
              end_time: endTime || null,
              meet_link: meetLink,
              attendees: JSON.stringify(attendees.map((a: { email: string }) => a.email)),
              synced_at: new Date().toISOString(),
            },
            { onConflict: "user_id,google_event_id,member_id" }
          )
          .select("id")
          .single();

        matchedMeetings.push({
          id: upserted?.id,
          title: event.summary || "Reunião",
          start_time: startTime,
          end_time: endTime || null,
          meet_link: meetLink,
          member_id: member.id,
          member_name: member.name,
          member_role: member.role,
        });
      }
    }

    // Auto-schedule Recall bots if auto_transcribe is enabled
    if (autoTranscribe && RECALL_API_KEY) {
      const autoScheduled: string[] = [];

      for (const meeting of matchedMeetings) {
        if (!meeting.meet_link || !meeting.id) continue;

        // Check if bot already exists for this meeting
        const { data: existingBot } = await supabaseAdmin
          .from("recall_bots")
          .select("id")
          .eq("user_id", userId)
          .eq("meeting_id", meeting.id)
          .not("status", "eq", "error")
          .maybeSingle();

        if (existingBot) continue;

        // Schedule bot via Recall.ai API (server-to-server)
        const joinAt = new Date(new Date(meeting.start_time).getTime() - 60 * 1000).toISOString();

        try {
          const recallResponse = await fetch("https://us-west-2.recall.ai/api/v1/bot/", {
            method: "POST",
            headers: {
              "Authorization": `Token ${RECALL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              meeting_url: meeting.meet_link,
              join_at: joinAt,
              bot_name: "Rhitmo",
              transcription_options: {
                provider: "meeting_captions",
              },
              recording_mode: "speaker_view",
            }),
          });

          const recallData = await recallResponse.json();

          if (recallResponse.ok && recallData.id) {
            await supabaseAdmin
              .from("recall_bots")
              .insert({
                user_id: userId,
                meeting_id: meeting.id,
                member_id: meeting.member_id,
                recall_bot_id: recallData.id,
                meeting_url: meeting.meet_link,
                status: "scheduled",
                scheduled_at: joinAt,
              });

            autoScheduled.push(meeting.id);
            console.log(`Auto-scheduled bot for meeting ${meeting.id}: ${recallData.id}`);
          } else {
            console.error(`Auto-schedule failed for meeting ${meeting.id}:`, recallData);
          }
        } catch (e) {
          console.error(`Auto-schedule error for meeting ${meeting.id}:`, e);
        }
      }

      if (autoScheduled.length > 0) {
        console.log(`Auto-scheduled ${autoScheduled.length} bots`);
      }
    }

    // Clean up past meetings
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("upcoming_meetings")
      .delete()
      .eq("user_id", userId)
      .lt("start_time", oneHourAgo);

    return new Response(JSON.stringify({ meetings: matchedMeetings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
