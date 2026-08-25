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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      access_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          jury_id: string | null
          role: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          jury_id?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          jury_id?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_codes_jury_id_fkey"
            columns: ["jury_id"]
            isOneToOne: false
            referencedRelation: "juries"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          created_at: string
          id: string
          locked: boolean
          name: string
          owner_jury_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          locked?: boolean
          name?: string
          owner_jury_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          locked?: boolean
          name?: string
          owner_jury_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitions_owner_jury_fk"
            columns: ["owner_jury_id"]
            isOneToOne: false
            referencedRelation: "juries"
            referencedColumns: ["id"]
          },
        ]
      }
      criteria: {
        Row: {
          competition_id: string
          created_at: string
          id: string
          label: string
          max_points: number
          position: number
          updated_at: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          id?: string
          label?: string
          max_points?: number
          position?: number
          updated_at?: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          id?: string
          label?: string
          max_points?: number
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "criteria_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      juries: {
        Row: {
          competition_id: string | null
          created_at: string
          id: string
          is_president: boolean
          name: string
          updated_at: string
        }
        Insert: {
          competition_id?: string | null
          created_at?: string
          id?: string
          is_president?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          competition_id?: string | null
          created_at?: string
          id?: string
          is_president?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "juries_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          competition_id: string
          created_at: string
          criterion_id: string
          id: string
          jury_id: string
          team_id: string
          updated_at: string
          value: number
        }
        Insert: {
          competition_id: string
          created_at?: string
          criterion_id: string
          id?: string
          jury_id: string
          team_id: string
          updated_at?: string
          value?: number
        }
        Update: {
          competition_id?: string
          created_at?: string
          criterion_id?: string
          id?: string
          jury_id?: string
          team_id?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "scores_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_jury_id_fkey"
            columns: ["jury_id"]
            isOneToOne: false
            referencedRelation: "juries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          competition_id: string
          created_at: string
          id: string
          name: string
          project_number: number
          updated_at: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          id?: string
          name?: string
          project_number: number
          updated_at?: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          id?: string
          name?: string
          project_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_assign_code: {
        Args: { p_code: string; p_jury_id: string }
        Returns: undefined
      }
      app_create_president: {
        Args: { p_admin_code: string; p_code: string; p_name: string }
        Returns: string
      }
      app_delete_president: {
        Args: { p_admin_code: string; p_president_id: string }
        Returns: undefined
      }
      app_is_admin: { Args: { p_code: string }; Returns: boolean }
      app_list_jury_codes: {
        Args: { p_code: string; p_competition_id: string }
        Returns: {
          code: string
          jury_id: string
        }[]
      }
      app_list_presidents: {
        Args: { p_admin_code: string }
        Returns: {
          code: string
          competitionId: string
          competitionName: string
          id: string
          locked: boolean
          name: string
        }[]
      }
      app_login_with_code: { Args: { p_code: string }; Returns: Json }
      app_president_id: { Args: { p_code: string }; Returns: string }
      app_set_jury_code: {
        Args: { p_code: string; p_jury_code: string; p_jury_id: string }
        Returns: undefined
      }
      app_set_president_code: {
        Args: { p_admin_code: string; p_code: string; p_president_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
