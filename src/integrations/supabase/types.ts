export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_impersonation: {
        Row: {
          admin_user_id: string
          created_at: string | null
          ended_at: string | null
          expires_at: string
          id: string
          impersonated_email: string | null
          impersonated_user_id: string
          reason: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string | null
          ended_at?: string | null
          expires_at?: string
          id?: string
          impersonated_email?: string | null
          impersonated_user_id: string
          reason?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string | null
          ended_at?: string | null
          expires_at?: string
          id?: string
          impersonated_email?: string | null
          impersonated_user_id?: string
          reason?: string | null
        }
        Relationships: []
      }
      admin_impersonation_audit: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          impersonated_email: string | null
          impersonated_user_id: string
          reason: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          impersonated_email?: string | null
          impersonated_user_id: string
          reason?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          impersonated_email?: string | null
          impersonated_user_id?: string
          reason?: string | null
        }
        Relationships: []
      }
      automation_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          items_processed: number
          job_name: string
          metadata: Json
          started_at: string
          status: string
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          items_processed?: number
          job_name: string
          metadata?: Json
          started_at?: string
          status?: string
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          items_processed?: number
          job_name?: string
          metadata?: Json
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      bias_detections: {
        Row: {
          bias_type: string
          context: string | null
          created_at: string | null
          detected_words: string[] | null
          dismissed: boolean | null
          id: string
          leader_id: string
          member_id: string | null
        }
        Insert: {
          bias_type: string
          context?: string | null
          created_at?: string | null
          detected_words?: string[] | null
          dismissed?: boolean | null
          id?: string
          leader_id: string
          member_id?: string | null
        }
        Update: {
          bias_type?: string
          context?: string | null
          created_at?: string | null
          detected_words?: string[] | null
          dismissed?: boolean | null
          id?: string
          leader_id?: string
          member_id?: string | null
        }
        Relationships: []
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          is_pinned: boolean
          member_id: string | null
          slack_conversation_id: string | null
          source: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_pinned?: boolean
          member_id?: string | null
          slack_conversation_id?: string | null
          source?: string
          title?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_pinned?: boolean
          member_id?: string | null
          slack_conversation_id?: string | null
          source?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      competencies: {
        Row: {
          created_at: string
          description: string | null
          framework_id: string
          id: string
          is_active: boolean
          name: string
          order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          framework_id: string
          id?: string
          is_active?: boolean
          name: string
          order: number
        }
        Update: {
          created_at?: string
          description?: string | null
          framework_id?: string
          id?: string
          is_active?: boolean
          name?: string
          order?: number
        }
        Relationships: [
          {
            foreignKeyName: "competencies_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "competency_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      competency_frameworks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competency_frameworks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      competency_level_descriptions: {
        Row: {
          competency_id: string
          created_at: string
          description: string
          examples: Json | null
          id: string
          seniority_level: string
        }
        Insert: {
          competency_id: string
          created_at?: string
          description: string
          examples?: Json | null
          id?: string
          seniority_level: string
        }
        Update: {
          competency_id?: string
          created_at?: string
          description?: string
          examples?: Json | null
          id?: string
          seniority_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "competency_level_descriptions_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
        ]
      }
      competency_templates: {
        Row: {
          company: string
          competencies: Json
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          job_title: string
          level: string | null
          name: string
          source: string | null
        }
        Insert: {
          company: string
          competencies: Json
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          job_title: string
          level?: string | null
          name: string
          source?: string | null
        }
        Update: {
          company?: string
          competencies?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          job_title?: string
          level?: string | null
          name?: string
          source?: string | null
        }
        Relationships: []
      }
      context_briefs: {
        Row: {
          conversations: Json
          evidence_count: number
          generated_at: string
          id: string
          in_motion: Json
          leader_user_id: string
          member_id: string
          model: string | null
          risks: Json
          window_days: number
          window_end: string
          window_start: string
          wins: Json
        }
        Insert: {
          conversations?: Json
          evidence_count?: number
          generated_at?: string
          id?: string
          in_motion?: Json
          leader_user_id: string
          member_id: string
          model?: string | null
          risks?: Json
          window_days?: number
          window_end: string
          window_start: string
          wins?: Json
        }
        Update: {
          conversations?: Json
          evidence_count?: number
          generated_at?: string
          id?: string
          in_motion?: Json
          leader_user_id?: string
          member_id?: string
          model?: string | null
          risks?: Json
          window_days?: number
          window_end?: string
          window_start?: string
          wins?: Json
        }
        Relationships: [
          {
            foreignKeyName: "context_briefs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      context_evidence: {
        Row: {
          actor_user_id: string | null
          created_at: string
          embedding: string | null
          evidence_type: string
          id: string
          member_id: string
          metadata: Json
          occurred_at: string
          sentiment: string | null
          source_id: string
          source_table: string
          summary: string | null
          tags: string[]
          title: string | null
          updated_at: string
          visibility: string
          workspace_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          embedding?: string | null
          evidence_type: string
          id?: string
          member_id: string
          metadata?: Json
          occurred_at: string
          sentiment?: string | null
          source_id: string
          source_table: string
          summary?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          visibility?: string
          workspace_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          embedding?: string | null
          evidence_type?: string
          id?: string
          member_id?: string
          metadata?: Json
          occurred_at?: string
          sentiment?: string | null
          source_id?: string
          source_table?: string
          summary?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          visibility?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "context_evidence_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      development_items: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          leader_note: string | null
          plan_id: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          leader_note?: string | null
          plan_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          leader_note?: string | null
          plan_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "development_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "development_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      development_plans: {
        Row: {
          approved_at: string | null
          created_at: string | null
          created_by_member: boolean | null
          id: string
          leader_comment: string | null
          member_id: string | null
          period_label: string | null
          proposed_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          created_at?: string | null
          created_by_member?: boolean | null
          id?: string
          leader_comment?: string | null
          member_id?: string | null
          period_label?: string | null
          proposed_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          created_at?: string | null
          created_by_member?: boolean | null
          id?: string
          leader_comment?: string | null
          member_id?: string | null
          period_label?: string | null
          proposed_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "development_plans_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      enterprise_leads: {
        Row: {
          company: string
          company_size: string
          consent: boolean | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          job_title: string
          message: string | null
          phone: string | null
          status: string | null
        }
        Insert: {
          company: string
          company_size: string
          consent?: boolean | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          job_title: string
          message?: string | null
          phone?: string | null
          status?: string | null
        }
        Update: {
          company?: string
          company_size?: string
          consent?: boolean | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          job_title?: string
          message?: string | null
          phone?: string | null
          status?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          actor_user_id: string | null
          attempts: number
          channels: string[]
          created_at: string
          dispatched_at: string | null
          error: string | null
          event_type: string
          id: string
          payload: Json
          status: string
          target_user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          attempts?: number
          channels?: string[]
          created_at?: string
          dispatched_at?: string | null
          error?: string | null
          event_type: string
          id?: string
          payload?: Json
          status?: string
          target_user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          attempts?: number
          channels?: string[]
          created_at?: string
          dispatched_at?: string | null
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json
          status?: string
          target_user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      extension_tokens: {
        Row: {
          created_at: string
          id: string
          label: string | null
          last_used_at: string | null
          revoked_at: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback_streaks: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_feedback_week: string | null
          longest_streak: number | null
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_feedback_week?: string | null
          longest_streak?: number | null
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_feedback_week?: string | null
          longest_streak?: number | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_streaks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      feedbacks: {
        Row: {
          action_items: Json | null
          bias_alert: string | null
          coaching_tips: string | null
          content: string
          created_at: string
          embedding: string | null
          evidence_id: string | null
          id: string
          manager_id: string
          meeting_transcript_id: string | null
          member_id: string
          occurred_at: string
          sentiment: string | null
          source: string
          summary: string | null
          tags: string[] | null
          title: string | null
          type: string
          updated_at: string
          visibility: string | null
        }
        Insert: {
          action_items?: Json | null
          bias_alert?: string | null
          coaching_tips?: string | null
          content: string
          created_at?: string
          embedding?: string | null
          evidence_id?: string | null
          id?: string
          manager_id: string
          meeting_transcript_id?: string | null
          member_id: string
          occurred_at?: string
          sentiment?: string | null
          source?: string
          summary?: string | null
          tags?: string[] | null
          title?: string | null
          type: string
          updated_at?: string
          visibility?: string | null
        }
        Update: {
          action_items?: Json | null
          bias_alert?: string | null
          coaching_tips?: string | null
          content?: string
          created_at?: string
          embedding?: string | null
          evidence_id?: string | null
          id?: string
          manager_id?: string
          meeting_transcript_id?: string | null
          member_id?: string
          occurred_at?: string
          sentiment?: string | null
          source?: string
          summary?: string | null
          tags?: string[] | null
          title?: string | null
          type?: string
          updated_at?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "slack_ambient_evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_meeting_transcript_id_fkey"
            columns: ["meeting_transcript_id"]
            isOneToOne: false
            referencedRelation: "meeting_transcripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      function_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          event: string
          function_name: string
          id: string
          level: string
          metadata: Json
          request_id: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event: string
          function_name: string
          id?: string
          level: string
          metadata?: Json
          request_id: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event?: string
          function_name?: string
          id?: string
          level?: string
          metadata?: Json
          request_id?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      goals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          member_id: string
          metric_current: number | null
          metric_target: number | null
          metric_unit: string | null
          start_date: string | null
          status: string
          target_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          member_id: string
          metric_current?: number | null
          metric_target?: number | null
          metric_unit?: string | null
          start_date?: string | null
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          member_id?: string
          metric_current?: number | null
          metric_target?: number | null
          metric_unit?: string | null
          start_date?: string | null
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          auto_transcribe: boolean | null
          calendar_email: string | null
          created_at: string | null
          id: string
          refresh_token: string | null
          token_expiry: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          auto_transcribe?: boolean | null
          calendar_email?: string | null
          created_at?: string | null
          id?: string
          refresh_token?: string | null
          token_expiry?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          auto_transcribe?: boolean | null
          calendar_email?: string | null
          created_at?: string | null
          id?: string
          refresh_token?: string | null
          token_expiry?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      graph_events_raw: {
        Row: {
          actor_member_id: string | null
          created_at: string
          event_type: string
          external_ref: string
          id: string
          metadata: Json
          occurred_at: string
          source: string
          target_member_id: string | null
          weight: number
          workspace_id: string
        }
        Insert: {
          actor_member_id?: string | null
          created_at?: string
          event_type: string
          external_ref: string
          id?: string
          metadata?: Json
          occurred_at: string
          source: string
          target_member_id?: string | null
          weight?: number
          workspace_id: string
        }
        Update: {
          actor_member_id?: string | null
          created_at?: string
          event_type?: string
          external_ref?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          source?: string
          target_member_id?: string | null
          weight?: number
          workspace_id?: string
        }
        Relationships: []
      }
      job_roles: {
        Row: {
          created_at: string
          department: string | null
          description: string | null
          framework_id: string
          id: string
          level: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          description?: string | null
          framework_id: string
          id?: string
          level?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          description?: string | null
          framework_id?: string
          id?: string
          level?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_roles_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "competency_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      kudos: {
        Row: {
          company_value: string | null
          created_at: string | null
          from_user_id: string
          id: string
          message: string
          slack_channel_id: string | null
          slack_message_ts: string | null
          to_member_id: string
          workspace_id: string
        }
        Insert: {
          company_value?: string | null
          created_at?: string | null
          from_user_id: string
          id?: string
          message: string
          slack_channel_id?: string | null
          slack_message_ts?: string | null
          to_member_id: string
          workspace_id: string
        }
        Update: {
          company_value?: string | null
          created_at?: string | null
          from_user_id?: string
          id?: string
          message?: string
          slack_channel_id?: string | null
          slack_message_ts?: string | null
          to_member_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kudos_to_member_id_fkey"
            columns: ["to_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leader_digest_preferences: {
        Row: {
          cadence: Database["public"]["Enums"]["digest_cadence"]
          channel: Database["public"]["Enums"]["digest_channel"]
          created_at: string
          day_of_week: number
          hour_local: number
          last_sent_at: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cadence?: Database["public"]["Enums"]["digest_cadence"]
          channel?: Database["public"]["Enums"]["digest_channel"]
          created_at?: string
          day_of_week?: number
          hour_local?: number
          last_sent_at?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cadence?: Database["public"]["Enums"]["digest_cadence"]
          channel?: Database["public"]["Enums"]["digest_channel"]
          created_at?: string
          day_of_week?: number
          hour_local?: number
          last_sent_at?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leader_nudges: {
        Row: {
          action_url: string | null
          created_at: string | null
          dismissed_at: string | null
          email_sent_at: string | null
          id: string
          leader_id: string
          member_id: string | null
          message: string
          nudge_type: string
          severity: string | null
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          dismissed_at?: string | null
          email_sent_at?: string | null
          id?: string
          leader_id: string
          member_id?: string | null
          message: string
          nudge_type: string
          severity?: string | null
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          dismissed_at?: string | null
          email_sent_at?: string | null
          id?: string
          leader_id?: string
          member_id?: string | null
          message?: string
          nudge_type?: string
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leader_nudges_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_transcripts: {
        Row: {
          chunk_count: number | null
          created_at: string
          duration_seconds: number | null
          error_message: string | null
          extracted_commitments: string[] | null
          extracted_themes: string[] | null
          id: string
          leader_notes: string | null
          manager_id: string | null
          member_id: string | null
          processing_status: string
          transcript: string | null
          updated_at: string
        }
        Insert: {
          chunk_count?: number | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          extracted_commitments?: string[] | null
          extracted_themes?: string[] | null
          id?: string
          leader_notes?: string | null
          manager_id?: string | null
          member_id?: string | null
          processing_status?: string
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          chunk_count?: number | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          extracted_commitments?: string[] | null
          extracted_themes?: string[] | null
          id?: string
          leader_notes?: string | null
          manager_id?: string | null
          member_id?: string | null
          processing_status?: string
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_transcripts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_prompts: {
        Row: {
          answered_at: string | null
          created_at: string
          id: string
          linked_user_id: string | null
          member_id: string
          prompt_key: string
          prompt_text: string
          response: string | null
          shared_with_leader: boolean
          week_starting: string
        }
        Insert: {
          answered_at?: string | null
          created_at?: string
          id?: string
          linked_user_id?: string | null
          member_id: string
          prompt_key: string
          prompt_text: string
          response?: string | null
          shared_with_leader?: boolean
          week_starting: string
        }
        Update: {
          answered_at?: string | null
          created_at?: string
          id?: string
          linked_user_id?: string | null
          member_id?: string
          prompt_key?: string
          prompt_text?: string
          response?: string | null
          shared_with_leader?: boolean
          week_starting?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_prompts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          member_id: string | null
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          member_id?: string | null
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          member_id?: string | null
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_messages_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      mirror_insights: {
        Row: {
          contradiction_score: number
          created_at: string
          declared_priorities: Json
          dismissed_at: string | null
          evidence: Json
          id: string
          manager_id: string
          observed_themes: Json
          recommended_action: string | null
          summary: string
          week_starting: string
          workspace_id: string | null
        }
        Insert: {
          contradiction_score: number
          created_at?: string
          declared_priorities?: Json
          dismissed_at?: string | null
          evidence?: Json
          id?: string
          manager_id: string
          observed_themes?: Json
          recommended_action?: string | null
          summary: string
          week_starting: string
          workspace_id?: string | null
        }
        Update: {
          contradiction_score?: number
          created_at?: string
          declared_priorities?: Json
          dismissed_at?: string | null
          evidence?: Json
          id?: string
          manager_id?: string
          observed_themes?: Json
          recommended_action?: string | null
          summary?: string
          week_starting?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mirror_insights_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_recaps: {
        Row: {
          ai_generated_at: string | null
          ai_model: string | null
          concern_evidence: Json
          concern_text: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          dominant_pattern: string | null
          feedbacks_count: number
          highlight_evidence: Json
          highlight_text: string | null
          id: string
          low_evidence: boolean
          manager_id: string
          meetings_count: number
          member_id: string
          period_month: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_generated_at?: string | null
          ai_model?: string | null
          concern_evidence?: Json
          concern_text?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          dominant_pattern?: string | null
          feedbacks_count?: number
          highlight_evidence?: Json
          highlight_text?: string | null
          id?: string
          low_evidence?: boolean
          manager_id: string
          meetings_count?: number
          member_id: string
          period_month: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_generated_at?: string | null
          ai_model?: string | null
          concern_evidence?: Json
          concern_text?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          dominant_pattern?: string | null
          feedbacks_count?: number
          highlight_evidence?: Json
          highlight_text?: string | null
          id?: string
          low_evidence?: boolean
          manager_id?: string
          meetings_count?: number
          member_id?: string
          period_month?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      network_signals: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          detected_at: string
          detected_on: string | null
          id: string
          leader_user_id: string
          member_id: string
          payload: Json
          severity: string
          signal_type: string
          window_days: number
          workspace_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          detected_at?: string
          detected_on?: string | null
          id?: string
          leader_user_id: string
          member_id: string
          payload?: Json
          severity?: string
          signal_type: string
          window_days: number
          workspace_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          detected_at?: string
          detected_on?: string | null
          id?: string
          leader_user_id?: string
          member_id?: string
          payload?: Json
          severity?: string
          signal_type?: string
          window_days?: number
          workspace_id?: string
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          provider: string
          state_token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          provider?: string
          state_token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          provider?: string
          state_token?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_funnel_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          member_id: string | null
          payload: Json | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          member_id?: string | null
          payload?: Json | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          member_id?: string | null
          payload?: Json | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      onboarding_reconciliation_log: {
        Row: {
          duration_ms: number | null
          errors: Json | null
          id: string
          invites_expired: number
          members_linked: number
          ran_at: string
          summary: Json | null
          workspaces_fixed: number
        }
        Insert: {
          duration_ms?: number | null
          errors?: Json | null
          id?: string
          invites_expired?: number
          members_linked?: number
          ran_at?: string
          summary?: Json | null
          workspaces_fixed?: number
        }
        Update: {
          duration_ms?: number | null
          errors?: Json | null
          id?: string
          invites_expired?: number
          members_linked?: number
          ran_at?: string
          summary?: Json | null
          workspaces_fixed?: number
        }
        Relationships: []
      }
      peer_feedback_requests: {
        Row: {
          created_at: string
          edge_strength_at_request: number
          expires_at: string
          id: string
          leader_user_id: string
          peer_member_id: string | null
          peer_user_id: string
          responded_at: string | null
          response_text: string | null
          sent_at: string | null
          status: string
          subject_member_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          edge_strength_at_request?: number
          expires_at?: string
          id?: string
          leader_user_id: string
          peer_member_id?: string | null
          peer_user_id: string
          responded_at?: string | null
          response_text?: string | null
          sent_at?: string | null
          status?: string
          subject_member_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          edge_strength_at_request?: number
          expires_at?: string
          id?: string
          leader_user_id?: string
          peer_member_id?: string | null
          peer_user_id?: string
          responded_at?: string | null
          response_text?: string | null
          sent_at?: string | null
          status?: string
          subject_member_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_feedback_requests_peer_member_id_fkey"
            columns: ["peer_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_feedback_requests_subject_member_id_fkey"
            columns: ["subject_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_slack_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          expires_at: string
          id: string
          invited_by: string
          member_has_account: boolean | null
          member_id: string
          reminded_at: string | null
          slack_user_id: string
          status: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          invited_by: string
          member_has_account?: boolean | null
          member_id: string
          reminded_at?: string | null
          slack_user_id: string
          status?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          invited_by?: string
          member_has_account?: boolean | null
          member_id?: string
          reminded_at?: string | null
          slack_user_id?: string
          status?: string | null
        }
        Relationships: []
      }
      performance_reviews: {
        Row: {
          acknowledged_at: string | null
          author_user_id: string | null
          classification: string | null
          coaching_tip: string | null
          competency_evaluations: Json | null
          content: string
          created_at: string
          evidence_count: number | null
          id: string
          job_role_id: string | null
          loss_risk: string | null
          member_id: string
          member_viewed_at: string | null
          merit_recommendation: string | null
          period_end: string | null
          period_start: string | null
          period_type: string
          promotion_recommendation: string | null
          review_type: string
          sent_at: string | null
          shared_with_member: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          author_user_id?: string | null
          classification?: string | null
          coaching_tip?: string | null
          competency_evaluations?: Json | null
          content: string
          created_at?: string
          evidence_count?: number | null
          id?: string
          job_role_id?: string | null
          loss_risk?: string | null
          member_id: string
          member_viewed_at?: string | null
          merit_recommendation?: string | null
          period_end?: string | null
          period_start?: string | null
          period_type?: string
          promotion_recommendation?: string | null
          review_type?: string
          sent_at?: string | null
          shared_with_member?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          author_user_id?: string | null
          classification?: string | null
          coaching_tip?: string | null
          competency_evaluations?: Json | null
          content?: string
          created_at?: string
          evidence_count?: number | null
          id?: string
          job_role_id?: string | null
          loss_risk?: string | null
          member_id?: string
          member_viewed_at?: string | null
          merit_recommendation?: string | null
          period_end?: string | null
          period_start?: string | null
          period_type?: string
          promotion_recommendation?: string | null
          review_type?: string
          sent_at?: string | null
          shared_with_member?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_job_role_id_fkey"
            columns: ["job_role_id"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_surveys: {
        Row: {
          anonymity: string
          completed_at: string | null
          context_metadata: Json
          created_at: string
          dm_sent_at: string | null
          expires_at: string | null
          id: string
          launched_at: string | null
          member_id: string
          motivation: string | null
          name: string | null
          parent_pulse_id: string | null
          questions: Json
          requested_by: string
          responses: Json
          sent_at: string
          status: string
          summary: Json | null
          type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          anonymity?: string
          completed_at?: string | null
          context_metadata?: Json
          created_at?: string
          dm_sent_at?: string | null
          expires_at?: string | null
          id?: string
          launched_at?: string | null
          member_id: string
          motivation?: string | null
          name?: string | null
          parent_pulse_id?: string | null
          questions?: Json
          requested_by: string
          responses?: Json
          sent_at?: string
          status?: string
          summary?: Json | null
          type: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          anonymity?: string
          completed_at?: string | null
          context_metadata?: Json
          created_at?: string
          dm_sent_at?: string | null
          expires_at?: string | null
          id?: string
          launched_at?: string | null
          member_id?: string
          motivation?: string | null
          name?: string | null
          parent_pulse_id?: string | null
          questions?: Json
          requested_by?: string
          responses?: Json
          sent_at?: string
          status?: string
          summary?: Json | null
          type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_surveys_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_surveys_parent_pulse_id_fkey"
            columns: ["parent_pulse_id"]
            isOneToOne: false
            referencedRelation: "pulse_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      quarterly_recaps: {
        Row: {
          ai_generated_at: string | null
          ai_model: string | null
          ai_suggested_classification: string | null
          ai_suggested_next_action_key: string | null
          classification: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          evolution_vs_previous: string | null
          generation_mode: string
          highlights: Json
          id: string
          manager_id: string
          member_id: string
          network_context: Json
          next_action_key: string | null
          next_action_note: string | null
          peer_voices: Json
          period_end: string | null
          period_label: string | null
          period_quarter: string | null
          period_start: string | null
          recurring_patterns: Json
          slack_delivered_at: string | null
          source_feedbacks_count: number
          source_meetings_count: number
          source_monthly_recap_ids: string[]
          status: string
          turnover_risk: string | null
          turnover_risk_reason: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_generated_at?: string | null
          ai_model?: string | null
          ai_suggested_classification?: string | null
          ai_suggested_next_action_key?: string | null
          classification?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          evolution_vs_previous?: string | null
          generation_mode?: string
          highlights?: Json
          id?: string
          manager_id: string
          member_id: string
          network_context?: Json
          next_action_key?: string | null
          next_action_note?: string | null
          peer_voices?: Json
          period_end?: string | null
          period_label?: string | null
          period_quarter?: string | null
          period_start?: string | null
          recurring_patterns?: Json
          slack_delivered_at?: string | null
          source_feedbacks_count?: number
          source_meetings_count?: number
          source_monthly_recap_ids?: string[]
          status?: string
          turnover_risk?: string | null
          turnover_risk_reason?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_generated_at?: string | null
          ai_model?: string | null
          ai_suggested_classification?: string | null
          ai_suggested_next_action_key?: string | null
          classification?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          evolution_vs_previous?: string | null
          generation_mode?: string
          highlights?: Json
          id?: string
          manager_id?: string
          member_id?: string
          network_context?: Json
          next_action_key?: string | null
          next_action_note?: string | null
          peer_voices?: Json
          period_end?: string | null
          period_label?: string | null
          period_quarter?: string | null
          period_start?: string | null
          recurring_patterns?: Json
          slack_delivered_at?: string | null
          source_feedbacks_count?: number
          source_meetings_count?: number
          source_monthly_recap_ids?: string[]
          status?: string
          turnover_risk?: string | null
          turnover_risk_reason?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      recall_bots: {
        Row: {
          attempt_count: number
          created_at: string | null
          error_message: string | null
          id: string
          leader_check_attempts: number
          leader_check_due_at: string | null
          leader_detected: boolean
          leader_email: string | null
          meeting_id: string | null
          meeting_transcript_id: string | null
          meeting_url: string
          member_id: string | null
          recall_bot_id: string
          scheduled_at: string | null
          status: string
          transcript: string | null
          transcript_data: Json | null
          trigger_source: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string | null
          error_message?: string | null
          id?: string
          leader_check_attempts?: number
          leader_check_due_at?: string | null
          leader_detected?: boolean
          leader_email?: string | null
          meeting_id?: string | null
          meeting_transcript_id?: string | null
          meeting_url: string
          member_id?: string | null
          recall_bot_id: string
          scheduled_at?: string | null
          status?: string
          transcript?: string | null
          transcript_data?: Json | null
          trigger_source?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attempt_count?: number
          created_at?: string | null
          error_message?: string | null
          id?: string
          leader_check_attempts?: number
          leader_check_due_at?: string | null
          leader_detected?: boolean
          leader_email?: string | null
          meeting_id?: string | null
          meeting_transcript_id?: string | null
          meeting_url?: string
          member_id?: string | null
          recall_bot_id?: string
          scheduled_at?: string | null
          status?: string
          transcript?: string | null
          transcript_data?: Json | null
          trigger_source?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recall_bots_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_bots_meeting_transcript_id_fkey"
            columns: ["meeting_transcript_id"]
            isOneToOne: false
            referencedRelation: "meeting_transcripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_bots_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      review_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          review_id: string
          section: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          review_id: string
          section?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          review_id?: string
          section?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_comments_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "performance_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_peers: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          invited_at: string
          peer_user_id: string
          response_jsonb: Json
          review_id: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          peer_user_id: string
          response_jsonb?: Json
          review_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          peer_user_id?: string
          response_jsonb?: Json
          review_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_peers_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "performance_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      rhitmo_sync_notifications: {
        Row: {
          change_summary: string
          changes: Json
          created_at: string | null
          id: string
          leader_user_id: string
          member_id: string
          read_at: string | null
        }
        Insert: {
          change_summary: string
          changes: Json
          created_at?: string | null
          id?: string
          leader_user_id: string
          member_id: string
          read_at?: string | null
        }
        Update: {
          change_summary?: string
          changes?: Json
          created_at?: string | null
          id?: string
          leader_user_id?: string
          member_id?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rhitmo_sync_notifications_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      role_competencies: {
        Row: {
          competency_id: string
          created_at: string
          expected_level: string | null
          id: string
          is_required: boolean | null
          job_role_id: string
          weight: number | null
        }
        Insert: {
          competency_id: string
          created_at?: string
          expected_level?: string | null
          id?: string
          is_required?: boolean | null
          job_role_id: string
          weight?: number | null
        }
        Update: {
          competency_id?: string
          created_at?: string
          expected_level?: string | null
          id?: string
          is_required?: boolean | null
          job_role_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "role_competencies_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_competencies_job_role_id_fkey"
            columns: ["job_role_id"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      slack_ambient_evidence: {
        Row: {
          captured_at: string
          category: Database["public"]["Enums"]["slack_evidence_category"]
          created_at: string
          feedback_id: string | null
          id: string
          manager_id: string
          member_id: string
          message_text: string
          permalink: string | null
          relevance_score: number
          reviewed_at: string | null
          slack_channel_id: string
          slack_channel_name: string | null
          slack_message_ts: string
          status: Database["public"]["Enums"]["slack_evidence_status"]
          summary: string | null
          workspace_id: string
        }
        Insert: {
          captured_at?: string
          category?: Database["public"]["Enums"]["slack_evidence_category"]
          created_at?: string
          feedback_id?: string | null
          id?: string
          manager_id: string
          member_id: string
          message_text: string
          permalink?: string | null
          relevance_score?: number
          reviewed_at?: string | null
          slack_channel_id: string
          slack_channel_name?: string | null
          slack_message_ts: string
          status?: Database["public"]["Enums"]["slack_evidence_status"]
          summary?: string | null
          workspace_id: string
        }
        Update: {
          captured_at?: string
          category?: Database["public"]["Enums"]["slack_evidence_category"]
          created_at?: string
          feedback_id?: string | null
          id?: string
          manager_id?: string
          member_id?: string
          message_text?: string
          permalink?: string | null
          relevance_score?: number
          reviewed_at?: string | null
          slack_channel_id?: string
          slack_channel_name?: string | null
          slack_message_ts?: string
          status?: Database["public"]["Enums"]["slack_evidence_status"]
          summary?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slack_ambient_evidence_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedbacks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slack_ambient_evidence_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slack_ambient_evidence_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      slack_app_home_throttle: {
        Row: {
          last_dm_menu_sent_at: string | null
          last_welcome_sent_at: string
          slack_team_id: string
          slack_user_id: string
        }
        Insert: {
          last_dm_menu_sent_at?: string | null
          last_welcome_sent_at?: string
          slack_team_id: string
          slack_user_id: string
        }
        Update: {
          last_dm_menu_sent_at?: string | null
          last_welcome_sent_at?: string
          slack_team_id?: string
          slack_user_id?: string
        }
        Relationships: []
      }
      slack_conversations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          intent: string
          last_message_at: string
          slack_user_id: string
          state_data: Json
          status: Database["public"]["Enums"]["slack_conversation_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          intent: string
          last_message_at?: string
          slack_user_id: string
          state_data?: Json
          status?: Database["public"]["Enums"]["slack_conversation_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          intent?: string
          last_message_at?: string
          slack_user_id?: string
          state_data?: Json
          status?: Database["public"]["Enums"]["slack_conversation_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      slack_integrations: {
        Row: {
          created_at: string | null
          id: string
          slack_team_id: string
          slack_user_id: string
          user_id: string
          welcome_dm_sent_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          slack_team_id: string
          slack_user_id: string
          user_id: string
          welcome_dm_sent_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          slack_team_id?: string
          slack_user_id?: string
          user_id?: string
          welcome_dm_sent_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slack_integrations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          id: string
          plan_tier: string
          quantity: number | null
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          plan_tier?: string
          quantity?: number | null
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          plan_tier?: string
          quantity?: number | null
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          avatar: string | null
          birth_year: number | null
          chronotype: string | null
          created_at: string
          email: string | null
          feedback_style: string | null
          gender: string | null
          id: string
          invite_status: string | null
          invite_token: string | null
          key_objectives: string | null
          last_anniversary_nudge_at: string | null
          linked_user_id: string | null
          motivators: Json | null
          name: string
          performance_score: number | null
          recognition_style: string | null
          role: string
          skills_data: Json | null
          slack_user_id: string | null
          team_id: string
          updated_at: string
          user_id: string | null
          user_manual: Json | null
          work_style_data: Json | null
        }
        Insert: {
          avatar?: string | null
          birth_year?: number | null
          chronotype?: string | null
          created_at?: string
          email?: string | null
          feedback_style?: string | null
          gender?: string | null
          id?: string
          invite_status?: string | null
          invite_token?: string | null
          key_objectives?: string | null
          last_anniversary_nudge_at?: string | null
          linked_user_id?: string | null
          motivators?: Json | null
          name: string
          performance_score?: number | null
          recognition_style?: string | null
          role: string
          skills_data?: Json | null
          slack_user_id?: string | null
          team_id: string
          updated_at?: string
          user_id?: string | null
          user_manual?: Json | null
          work_style_data?: Json | null
        }
        Update: {
          avatar?: string | null
          birth_year?: number | null
          chronotype?: string | null
          created_at?: string
          email?: string | null
          feedback_style?: string | null
          gender?: string | null
          id?: string
          invite_status?: string | null
          invite_token?: string | null
          key_objectives?: string | null
          last_anniversary_nudge_at?: string | null
          linked_user_id?: string | null
          motivators?: Json | null
          name?: string
          performance_score?: number | null
          recognition_style?: string | null
          role?: string
          skills_data?: Json | null
          slack_user_id?: string | null
          team_id?: string
          updated_at?: string
          user_id?: string | null
          user_manual?: Json | null
          work_style_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_network_edges: {
        Row: {
          computed_at: string
          event_count: number
          id: string
          last_event_at: string | null
          member_a_id: string
          member_b_id: string
          sources: string[]
          weight_total: number
          window_days: number
          workspace_id: string
        }
        Insert: {
          computed_at?: string
          event_count?: number
          id?: string
          last_event_at?: string | null
          member_a_id: string
          member_b_id: string
          sources?: string[]
          weight_total?: number
          window_days: number
          workspace_id: string
        }
        Update: {
          computed_at?: string
          event_count?: number
          id?: string
          last_event_at?: string | null
          member_a_id?: string
          member_b_id?: string
          sources?: string[]
          weight_total?: number
          window_days?: number
          workspace_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          id: string
          leader_user_id: string | null
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          leader_user_id?: string | null
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          leader_user_id?: string | null
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      upcoming_meetings: {
        Row: {
          attendees: Json | null
          brief_cache: Json | null
          brief_dm_sent_at: string | null
          brief_generated_at: string | null
          end_time: string | null
          google_event_id: string
          id: string
          meet_link: string | null
          member_id: string | null
          start_time: string
          synced_at: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          attendees?: Json | null
          brief_cache?: Json | null
          brief_dm_sent_at?: string | null
          brief_generated_at?: string | null
          end_time?: string | null
          google_event_id: string
          id?: string
          meet_link?: string | null
          member_id?: string | null
          start_time: string
          synced_at?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          attendees?: Json | null
          brief_cache?: Json | null
          brief_dm_sent_at?: string | null
          brief_generated_at?: string | null
          end_time?: string | null
          google_event_id?: string
          id?: string
          meet_link?: string | null
          member_id?: string | null
          start_time?: string
          synced_at?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upcoming_meetings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          channel: string
          created_at: string
          id: string
          notification_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          notification_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          notification_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          hide_slack_privacy_tips: boolean | null
          id: string
          onboarding_tour_completed_at: string | null
          theme_preference: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          hide_slack_privacy_tips?: boolean | null
          id?: string
          onboarding_tour_completed_at?: string | null
          theme_preference?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          hide_slack_privacy_tips?: boolean | null
          id?: string
          onboarding_tour_completed_at?: string | null
          theme_preference?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist_leads: {
        Row: {
          created_at: string
          email: string
          name: string | null
          phone: string | null
          status: string | null
          team_size: string | null
        }
        Insert: {
          created_at?: string
          email: string
          name?: string | null
          phone?: string | null
          status?: string | null
          team_size?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          name?: string | null
          phone?: string | null
          status?: string | null
          team_size?: string | null
        }
        Relationships: []
      }
      workspace_slack_settings: {
        Row: {
          ambient_mode_enabled: boolean
          autojoin_public_channels: boolean
          created_at: string
          excluded_channel_ids: string[]
          last_classifier_run_at: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ambient_mode_enabled?: boolean
          autojoin_public_channels?: boolean
          created_at?: string
          excluded_channel_ids?: string[]
          last_classifier_run_at?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ambient_mode_enabled?: boolean
          autojoin_public_channels?: boolean
          created_at?: string
          excluded_channel_ids?: string[]
          last_classifier_run_at?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_slack_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          client_account: string | null
          created_at: string
          customer_segment: string | null
          default_locale: string | null
          grandfather_until: string | null
          hr_admin_ids: string[] | null
          id: string
          is_active: boolean
          is_beta_user: boolean | null
          leader_sync_completed_at: string | null
          leader_sync_data: Json | null
          name: string
          owner_id: string
          paid_seats: number
          plan_tier: string
          seat_cycle: string
          updated_at: string
        }
        Insert: {
          client_account?: string | null
          created_at?: string
          customer_segment?: string | null
          default_locale?: string | null
          grandfather_until?: string | null
          hr_admin_ids?: string[] | null
          id?: string
          is_active?: boolean
          is_beta_user?: boolean | null
          leader_sync_completed_at?: string | null
          leader_sync_data?: Json | null
          name: string
          owner_id: string
          paid_seats?: number
          plan_tier?: string
          seat_cycle?: string
          updated_at?: string
        }
        Update: {
          client_account?: string | null
          created_at?: string
          customer_segment?: string | null
          default_locale?: string | null
          grandfather_until?: string | null
          hr_admin_ids?: string[] | null
          id?: string
          is_active?: boolean
          is_beta_user?: boolean | null
          leader_sync_completed_at?: string | null
          leader_sync_data?: Json | null
          name?: string
          owner_id?: string
          paid_seats?: number
          plan_tier?: string
          seat_cycle?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _ctx_resolve_workspace: { Args: { _member_id: string }; Returns: string }
      acknowledge_network_signal: {
        Args: { _signal_id: string }
        Returns: boolean
      }
      admin_activation_cohorts: { Args: never; Returns: Json }
      admin_cohort_workspaces: {
        Args: { p_cohort_month: string }
        Returns: Json
      }
      admin_funnel_metrics: { Args: never; Returns: Json }
      admin_revenue_metrics: { Args: never; Returns: Json }
      append_slack_conversation_turn: {
        Args: {
          p_conversation_id: string
          p_ttl_minutes?: number
          p_turn: Json
        }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          intent: string
          last_message_at: string
          slack_user_id: string
          state_data: Json
          status: Database["public"]["Enums"]["slack_conversation_status"]
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "slack_conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      backfill_context_evidence: {
        Args: { _workspace_id?: string }
        Returns: Json
      }
      can_update_own_sync: { Args: { member_id: string }; Returns: boolean }
      can_view_network_pair: {
        Args: {
          _member_a: string
          _member_b: string
          _strict?: boolean
          _workspace_id: string
        }
        Returns: boolean
      }
      check_is_admin: { Args: never; Returns: boolean }
      claim_team_member_by_email: {
        Args: { p_email: string; p_user_id: string }
        Returns: number
      }
      cleanup_expired_impersonations: { Args: never; Returns: undefined }
      cleanup_expired_oauth_states: { Args: never; Returns: undefined }
      create_default_competency_framework: {
        Args: { p_workspace_id: string }
        Returns: undefined
      }
      create_hr_admin_starter_workspace: {
        Args: {
          _leader_email?: string
          _team_name?: string
          _workspace_name: string
        }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      dismiss_recall_bot: { Args: { _bot_id: string }; Returns: boolean }
      effective_user_id: { Args: never; Returns: string }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      expire_stale_slack_conversations: { Args: never; Returns: number }
      get_account_context: {
        Args: { p_user_email?: string; p_user_id: string }
        Returns: Json
      }
      get_active_slack_conversation: {
        Args: { p_slack_user_id: string }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          intent: string
          last_message_at: string
          slack_user_id: string
          state_data: Json
          status: Database["public"]["Enums"]["slack_conversation_status"]
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "slack_conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_all_users_with_metadata: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          job_title: string
          phone: string
          team_size: string
          user_id: string
        }[]
      }
      get_hr_all_members: {
        Args: {
          _has_pdi?: boolean
          _leader_id?: string
          _limit?: number
          _offset?: number
          _search?: string
          _workspace_id: string
        }
        Returns: {
          days_since_last_feedback: number
          has_skills_map: boolean
          has_sync: boolean
          last_feedback_date: string
          leader_id: string
          leader_name: string
          member_email: string
          member_id: string
          member_name: string
          member_role: string
          pdi_count: number
          total_count: number
        }[]
      }
      get_hr_analytics_advanced: {
        Args: { _workspace_id: string }
        Returns: Json
      }
      get_hr_dashboard_metrics: {
        Args: { _workspace_id: string }
        Returns: Json
      }
      get_hr_leader_team: {
        Args: { _leader_id: string; _workspace_id: string }
        Returns: Json
      }
      get_hr_leaders_overview: {
        Args: { _workspace_id: string }
        Returns: Json
      }
      get_hr_member_profile: {
        Args: { _member_id: string; _workspace_id: string }
        Returns: {
          chronotype: string
          created_at: string
          feedback_count: number
          feedback_style: string
          has_pdi: boolean
          last_feedback_date: string
          leader_id: string
          leader_name: string
          member_email: string
          member_id: string
          member_name: string
          member_role: string
          motivators: Json
          pdi_count: number
          recognition_style: string
          skills_data: Json
          user_manual: Json
          work_style_data: Json
        }[]
      }
      get_invite_details: {
        Args: { p_invite_token: string }
        Returns: {
          member_email: string
          member_id: string
          member_name: string
          workspace_name: string
        }[]
      }
      get_invite_status: {
        Args: { p_invite_token: string }
        Returns: {
          linked_user_id: string
          member_email: string
          member_id: string
          member_name: string
          status: string
          workspace_name: string
        }[]
      }
      get_job_roles_with_competencies: {
        Args: { _framework_id: string }
        Returns: {
          competencies: Json
          competency_count: number
          role_department: string
          role_description: string
          role_id: string
          role_level: string
          role_title: string
        }[]
      }
      get_leaders_at_risk: {
        Args: { _workspace_id: string }
        Returns: {
          last_activity_at: string
          last_mentor_chat_at: string
          manager_email: string
          manager_id: string
          manager_name: string
          members_without_note_30d: number
          risk_reason: string
        }[]
      }
      get_member_for_sync: {
        Args: { p_member_id: string }
        Returns: {
          email: string
          id: string
          linked_user_id: string
          name: string
          role: string
          work_style_data: Json
        }[]
      }
      get_member_skill_radar: { Args: { _member_id: string }; Returns: Json }
      get_member_timeline: {
        Args: { _limit?: number; _member_id: string; _types?: string[] }
        Returns: {
          actor_user_id: string
          evidence_type: string
          id: string
          metadata: Json
          occurred_at: string
          sentiment: string
          source_id: string
          source_table: string
          summary: string
          tags: string[]
          title: string
          visibility: string
        }[]
      }
      get_review_evidence: {
        Args: { _member_id: string; _period_end: string; _period_start: string }
        Returns: {
          feedbacks: Json
          feedbacks_count: number
          meetings: Json
          meetings_count: number
          total_evidence_count: number
        }[]
      }
      get_seat_allowance: {
        Args: { _workspace_id: string }
        Returns: {
          free_seats: number
          grandfather_until: string
          is_grandfathered: boolean
          paid_seats: number
          recall_cap_hours: number
          recall_unlimited: boolean
          seat_cycle: string
          total_seats: number
        }[]
      }
      get_suppressed_member_emails: {
        Args: never
        Returns: {
          email: string
          reason: string
          suppressed_at: string
        }[]
      }
      get_sync_notification_data: {
        Args: { p_member_id: string }
        Returns: {
          leader_email: string
          leader_name: string
          member_name: string
          team_name: string
        }[]
      }
      get_team_pulse: {
        Args: { _window_days?: number }
        Returns: {
          detected_at: string
          id: string
          member_id: string
          member_name: string
          payload: Json
          severity: string
          signal_type: string
        }[]
      }
      get_team_timeline: {
        Args: {
          _before?: string
          _limit?: number
          _member_ids?: string[]
          _source_tables?: string[]
          _workspace_id?: string
        }
        Returns: {
          evidence_type: string
          id: string
          member_avatar: string
          member_id: string
          member_name: string
          metadata: Json
          occurred_at: string
          sentiment: string
          source_id: string
          source_table: string
          summary: string
          title: string
          visibility: string
        }[]
      }
      get_user_caps: {
        Args: never
        Returns: {
          email: string
          full_name: string
          hr_admin_of: Json
          is_super_admin: boolean
          leader_of: Json
          member_of: Json
          owner_of: Json
          user_id: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_user: { Args: { _user_id: string }; Returns: boolean }
      is_hr_admin_of_workspace: {
        Args: { _workspace_id: string }
        Returns: boolean
      }
      is_leader_of_team: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_leader: {
        Args: { _member_id: string; _user_id: string }
        Returns: boolean
      }
      is_workspace_owner: {
        Args: { _member_id: string; _user_id: string }
        Returns: boolean
      }
      is_workspace_owner_of_member: {
        Args: { _member_id: string }
        Returns: boolean
      }
      manage_hr_admin: {
        Args: { _action: string; _user_id: string; _workspace_id: string }
        Returns: undefined
      }
      match_context_evidence: {
        Args: {
          filter_evidence_types?: string[]
          filter_member_id?: string
          filter_workspace_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          evidence_type: string
          id: string
          member_id: string
          occurred_at: string
          sentiment: string
          similarity: number
          source_id: string
          source_table: string
          summary: string
          tags: string[]
          title: string
        }[]
      }
      match_feedbacks: {
        Args: {
          filter_member_id?: string
          filter_workspace_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          created_at: string
          id: string
          member_id: string
          similarity: number
          summary: string
          type: string
        }[]
      }
      member_acknowledge_review: {
        Args: { p_review_id: string }
        Returns: undefined
      }
      member_view_review: { Args: { p_review_id: string }; Returns: undefined }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      network_debug_stats: {
        Args: { _window_days?: number; _workspace_id: string }
        Returns: Json
      }
      network_debug_top_edges: {
        Args: { _limit?: number; _window_days?: number; _workspace_id: string }
        Returns: {
          event_count: number
          last_event_at: string
          member_a_id: string
          member_a_name: string
          member_b_id: string
          member_b_name: string
          sources: string[]
          weight_total: number
        }[]
      }
      open_or_resume_slack_conversation: {
        Args: {
          p_intent?: string
          p_slack_user_id: string
          p_ttl_minutes?: number
          p_workspace_id: string
        }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          intent: string
          last_message_at: string
          slack_user_id: string
          state_data: Json
          status: Database["public"]["Enums"]["slack_conversation_status"]
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "slack_conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      prune_graph_events_raw: { Args: never; Returns: number }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      rls_check_member_access: {
        Args: { _member_team_id: string }
        Returns: boolean
      }
      rls_check_member_read_access: {
        Args: { _member_team_id: string }
        Returns: boolean
      }
      rls_check_team_access: { Args: { _team_id: string }; Returns: boolean }
      rls_check_team_read_access: {
        Args: { _team_id: string }
        Returns: boolean
      }
      rls_check_workspace_access: {
        Args: { _workspace_id: string }
        Returns: boolean
      }
      submit_rhitmo_sync: {
        Args: { p_member_id: string; p_work_style_data: Json }
        Returns: boolean
      }
      submit_rhitmo_sync_v2: {
        Args: {
          p_birth_year?: number
          p_chronotype?: string
          p_feedback_style?: string
          p_gender?: string
          p_member_id: string
          p_motivators?: Json
          p_recognition_style?: string
          p_user_manual?: Json
          p_work_style_data?: Json
        }
        Returns: boolean
      }
      update_feedback_streak: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: undefined
      }
      update_member_own_data: {
        Args: { p_skills_data?: Json; p_work_style_data?: Json }
        Returns: boolean
      }
      user_is_linked_member: {
        Args: { _member_id: string; _user_id: string }
        Returns: boolean
      }
      user_owns_team: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      workspace_is_active: { Args: { _workspace_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin"
      digest_cadence: "weekly" | "biweekly" | "monthly"
      digest_channel: "slack" | "in_app" | "both"
      slack_conversation_status: "active" | "completed" | "expired"
      slack_evidence_category:
        | "entrega"
        | "bloqueio"
        | "reconhecimento"
        | "conflito"
        | "outro"
      slack_evidence_status:
        | "pending"
        | "approved"
        | "dismissed"
        | "converted_to_feedback"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin"],
      digest_cadence: ["weekly", "biweekly", "monthly"],
      digest_channel: ["slack", "in_app", "both"],
      slack_conversation_status: ["active", "completed", "expired"],
      slack_evidence_category: [
        "entrega",
        "bloqueio",
        "reconhecimento",
        "conflito",
        "outro",
      ],
      slack_evidence_status: [
        "pending",
        "approved",
        "dismissed",
        "converted_to_feedback",
      ],
    },
  },
} as const
