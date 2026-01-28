import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface BackupRequest {
  type: 'feedback' | 'review';
  data: Record<string, unknown>;
  userId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's JWT
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } }
      }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { type, data, userId } = await req.json() as BackupRequest;

    // Validate request
    if (!type || !data || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, data, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Security check: user can only backup their own data
    if (userId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot backup data for another user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate type
    if (!['feedback', 'review'].includes(type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid type. Must be "feedback" or "review"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate file path: /{userId}/{year}/{month}/{type}_{timestamp}.json
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const path = `${userId}/${year}/${month}/${type}_${timestamp}.json`;

    console.log(`Backing up ${type} to path: ${path}`);

    // Prepare backup data with metadata
    const backupPayload = {
      _backup_metadata: {
        backed_up_at: now.toISOString(),
        type,
        user_id: userId,
        original_timestamp: data.created_at || now.toISOString()
      },
      ...data
    };

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('data-backups')
      .upload(path, JSON.stringify(backupPayload, null, 2), {
        contentType: 'application/json',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload backup', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Backup successful: ${path}`);

    return new Response(
      JSON.stringify({ success: true, path }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Backup error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
