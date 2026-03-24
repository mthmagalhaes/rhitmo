

## Plan: Secure meeting-recordings Bucket

### Problem
The `meeting-recordings` bucket is public (`public = true`), meaning anyone with a file URL can download audio recordings without authentication. This is a critical privacy violation.

### Approach
Since the upload function stores files as `{userId}/{timestamp}.ext` (where `userId` is the manager's auth UUID), we can use the folder path for RLS instead of complex joins through `meeting_transcripts`. The edge function uses `supabaseServiceKey` for uploads, so it bypasses RLS — no change needed there.

### Migration (single SQL migration)

**1. Make bucket private:**
```sql
UPDATE storage.buckets SET public = false WHERE id = 'meeting-recordings';
```

**2. Storage RLS policies:**

- **INSERT**: Allow authenticated users to upload into their own folder (`auth.uid()::text = (storage.foldername(name))[1]`). Note: the edge function uses service role so this doesn't affect it, but it's good practice.
- **SELECT**: Manager can read files in their own folder. HR Admins need access too — but since there's no simple folder-based check for HR admins, we add a policy that checks `is_hr_admin_of_workspace` via the workspace chain.
- **DELETE**: Only the file owner (manager) can delete.

Simplified policies using folder-based ownership:

```sql
-- Manager can upload to own folder
CREATE POLICY "Managers upload own recordings"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'meeting-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Manager can view own folder
CREATE POLICY "Managers view own recordings"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'meeting-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- HR Admin can view workspace recordings
CREATE POLICY "HR Admin view workspace recordings"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'meeting-recordings' AND
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE (storage.foldername(name))[1]::uuid = w.owner_id
        AND is_hr_admin_of_workspace(w.id)
    )
  );

-- Manager can delete own recordings
CREATE POLICY "Managers delete own recordings"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'meeting-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**3. Update edge function** — After making the bucket private, `getPublicUrl` no longer works for unauthenticated access. The edge function currently stores the public URL in `meeting_transcripts.transcript` field before transcription replaces it. Since the transcript text overwrites the URL after Whisper completes, the public URL is only temporarily stored and not used for playback. No change needed — the audio file path is already stored implicitly via the folder structure.

### No frontend changes needed
The app doesn't display audio playback URLs to users. The `transcript` field gets overwritten with actual text after transcription.

### Technical Notes
- The user's proposed RLS using `meeting_transcripts.audio_url` won't work because there's no `audio_url` column — the URL was temporarily stored in `transcript` then overwritten
- Folder-based RLS (`foldername`) is simpler, more performant, and doesn't require cross-table joins
- Edge function uses service role key, so it bypasses all storage RLS — uploads continue to work
- HR Admin access uses the existing `is_hr_admin_of_workspace` function, checking if the folder owner (manager) belongs to a workspace where the current user is HR admin

