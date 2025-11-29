-- Create performance_reviews table
CREATE TABLE public.performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trigger for updated_at
CREATE TRIGGER update_performance_reviews_updated_at
  BEFORE UPDATE ON public.performance_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

-- RLS: Same policies as team_members (via workspace owner)
CREATE POLICY "Owners podem ver avaliações dos membros"
  ON public.performance_reviews
  FOR SELECT
  USING (is_workspace_owner(auth.uid(), member_id));

CREATE POLICY "Owners podem criar avaliações"
  ON public.performance_reviews
  FOR INSERT
  WITH CHECK (is_workspace_owner(auth.uid(), member_id));

CREATE POLICY "Owners podem atualizar avaliações"
  ON public.performance_reviews
  FOR UPDATE
  USING (is_workspace_owner(auth.uid(), member_id));

CREATE POLICY "Owners podem deletar avaliações"
  ON public.performance_reviews
  FOR DELETE
  USING (is_workspace_owner(auth.uid(), member_id));