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
}
