CREATE TABLE public.review_signal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.performance_reviews(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'delivery',
  title text NOT NULL DEFAULT '',
  suggested_text text,
  final_text text,
  status text NOT NULL DEFAULT 'pending',
  doc_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX review_signal_items_review_idx ON public.review_signal_items(review_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_signal_items TO authenticated;
GRANT ALL ON public.review_signal_items TO service_role;
ALTER TABLE public.review_signal_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review managers manage signal items" ON public.review_signal_items
  FOR ALL TO authenticated USING (public.can_manage_review(review_id)) WITH CHECK (public.can_manage_review(review_id));