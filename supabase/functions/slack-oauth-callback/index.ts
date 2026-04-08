const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateStateToken(slackUserId: string, slackTeamId: string): Promise<string> {
  const secret = Deno.env.get('SLACK_SIGNING_SECRET')!;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = `${slackUserId}:${slackTeamId}:${timestamp}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const hexSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  const b64Payload = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64Sig = btoa(hexSig).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64Payload}.${b64Sig}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('[OAUTH] Slack returned error:', error);
      return Response.redirect('https://rhitmo.co/dashboard?slack_error=denied', 302);
    }

    if (!code) {
      return new Response('Missing code parameter', { status: 400, headers: corsHeaders });
    }

    const clientId = Deno.env.get('SLACK_CLIENT_ID');
    const clientSecret = Deno.env.get('SLACK_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/slack-oauth-callback`;

    if (!clientId || !clientSecret) {
      console.error('[OAUTH] Missing SLACK_CLIENT_ID or SLACK_CLIENT_SECRET');
      return new Response('Server configuration error', { status: 500, headers: corsHeaders });
    }

    // Exchange code for token
    const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    console.log('[OAUTH] Token exchange ok:', tokenData.ok, '| error:', tokenData.error || 'none');

    if (!tokenData.ok) {
      console.error('[OAUTH] Token exchange failed:', tokenData.error);
      return Response.redirect(`https://rhitmo.co/dashboard?slack_error=${tokenData.error}`, 302);
    }

    const slackUserId = tokenData.authed_user?.id;
    const slackTeamId = tokenData.team?.id;

    if (!slackUserId || !slackTeamId) {
      console.error('[OAUTH] Missing user/team from response:', JSON.stringify(tokenData));
      return Response.redirect('https://rhitmo.co/dashboard?slack_error=missing_ids', 302);
    }

    console.log('[OAUTH] Got user:', slackUserId, 'team:', slackTeamId);

    // Generate HMAC state token
    const stateToken = await generateStateToken(slackUserId, slackTeamId);

    // Redirect to SlackConnect page
    return Response.redirect(`https://rhitmo.co/slack/connect?state=${encodeURIComponent(stateToken)}`, 302);

  } catch (err) {
    console.error('[OAUTH] Error:', err);
    return Response.redirect('https://rhitmo.co/dashboard?slack_error=internal', 302);
  }
});
