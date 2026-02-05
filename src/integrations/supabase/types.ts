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
          id: string
          impersonated_email: string | null
          impersonated_user_id: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string | null
          id?: string
          impersonated_email?: string | null
          impersonated_user_id: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string | null
          id?: string
          impersonated_email?: string | null
          impersonated_user_id?: string
        }
        Relationships: []
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          member_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          title?: string
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
      feedbacks: {
        Row: {
          action_items: Json | null
          bias_alert: string | null
          coaching_tips: string | null
          content: string
          created_at: string
          embedding: string | null
          id: string
          manager_id: string
          meeting_transcript_id: string | null
          member_id: string
          occurred_at: string
          sentiment: string | null
          source: string
          summary: string | null
          tags: string[] | null
          type: string
          updated_at: string
        }
        Insert: {
          action_items?: Json | null
          bias_alert?: string | null
          coaching_tips?: string | null
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          manager_id: string
          meeting_transcript_id?: string | null
          member_id: string
          occurred_at?: string
          sentiment?: string | null
          source?: string
          summary?: string | null
          tags?: string[] | null
          type: string
          updated_at?: string
        }
        Update: {
          action_items?: Json | null
          bias_alert?: string | null
          coaching_tips?: string | null
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          manager_id?: string
          meeting_transcript_id?: string | null
          member_id?: string
          occurred_at?: string
          sentiment?: string | null
          source?: string
          summary?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string
        }
        Relationships: [
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
      meeting_transcripts: {
        Row: {
          chunk_count: number | null
          created_at: string
          duration_seconds: number | null
          extracted_commitments: string[] | null
          extracted_themes: string[] | null
          id: string
          leader_notes: string | null
          manager_id: string
          member_id: string
          processing_status: string
          transcript: string | null
          updated_at: string
        }
        Insert: {
          chunk_count?: number | null
          created_at?: string
          duration_seconds?: number | null
          extracted_commitments?: string[] | null
          extracted_themes?: string[] | null
          id?: string
          leader_notes?: string | null
          manager_id: string
          member_id: string
          processing_status?: string
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          chunk_count?: number | null
          created_at?: string
          duration_seconds?: number | null
          extracted_commitments?: string[] | null
          extracted_themes?: string[] | null
          id?: string
          leader_notes?: string | null
          manager_id?: string
          member_id?: string
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
      mentor_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          member_id: string
          role: string
          thread_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          member_id: string
          role: string
          thread_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          member_id?: string
          role?: string
          thread_id?: string | null
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
      performance_reviews: {
        Row: {
          coaching_tip: string | null
          content: string
          created_at: string
          id: string
          member_id: string
          period_end: string | null
          period_start: string | null
          period_type: string
          title: string
          updated_at: string
        }
        Insert: {
          coaching_tip?: string | null
          content: string
          created_at?: string
          id?: string
          member_id: string
          period_end?: string | null
          period_start?: string | null
          period_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          coaching_tip?: string | null
          content?: string
          created_at?: string
          id?: string
          member_id?: string
          period_end?: string | null
          period_start?: string | null
          period_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
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
          key_objectives: string | null
          motivators: Json | null
          name: string
          performance_score: number | null
          recognition_style: string | null
          role: string
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
          key_objectives?: string | null
          motivators?: Json | null
          name: string
          performance_score?: number | null
          recognition_style?: string | null
          role: string
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
          key_objectives?: string | null
          motivators?: Json | null
          name?: string
          performance_score?: number | null
          recognition_style?: string | null
          role?: string
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
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
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
      workspaces: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          owner_id: string
          plan_tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          owner_id: string
          plan_tier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string
          plan_tier?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_update_own_sync: { Args: { member_id: string }; Returns: boolean }
      check_is_admin: { Args: never; Returns: boolean }
      effective_user_id: { Args: never; Returns: string }
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
      get_member_for_sync: {
        Args: { p_member_id: string }
        Returns: {
          id: string
          name: string
          role: string
          work_style_data: Json
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_workspace_owner: {
        Args: { _member_id: string; _user_id: string }
        Returns: boolean
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
      user_owns_team: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      workspace_is_active: { Args: { _workspace_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "support"
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
      app_role: ["super_admin", "support"],
    },
  },
} as const
