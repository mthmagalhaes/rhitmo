-- Add coaching_tip column to performance_reviews table
ALTER TABLE public.performance_reviews 
ADD COLUMN coaching_tip TEXT;