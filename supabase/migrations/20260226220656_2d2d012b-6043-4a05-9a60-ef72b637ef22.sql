ALTER TABLE performance_reviews 
ADD COLUMN IF NOT EXISTS member_viewed_at timestamptz DEFAULT NULL;