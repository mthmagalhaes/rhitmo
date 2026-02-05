-- Add tags column to feedbacks table for Smart Tags feature
ALTER TABLE public.feedbacks 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';