export interface Feedback {
  id: string;
  date: string;
  content: string;
  type: 'positive' | 'constructive' | 'neutral';
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  lastFeedback: string;
  feedbackCount: number;
  performanceScore: number;
  teamId?: string;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  is_active: boolean;
  plan_tier: 'pulse' | 'flow' | 'maestro';
  created_at: string;
  updated_at: string;
  leader_sync_data?: Record<string, unknown> | null;
  leader_sync_completed_at?: string | null;
}

export interface Team {
  id: string;
  name: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export type PlanTier = 'pulse' | 'flow' | 'maestro';
