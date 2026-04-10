
-- Table for dedicated extension authentication tokens
CREATE TABLE public.extension_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  token_hash text NOT NULL,
  label text DEFAULT 'Chrome Extension',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone,
  revoked_at timestamp with time zone
);

-- Index for fast lookup by hash
CREATE INDEX idx_extension_tokens_hash ON public.extension_tokens (token_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_extension_tokens_user ON public.extension_tokens (user_id) WHERE revoked_at IS NULL;

-- Enable RLS
ALTER TABLE public.extension_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own tokens (not the hash itself, but metadata)
CREATE POLICY "Users can view own extension tokens"
  ON public.extension_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own tokens
CREATE POLICY "Users can insert own extension tokens"
  ON public.extension_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can revoke (update) their own tokens
CREATE POLICY "Users can update own extension tokens"
  ON public.extension_tokens FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Service role full access (for backend validation)
CREATE POLICY "Service role full access"
  ON public.extension_tokens FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
