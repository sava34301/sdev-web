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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      code_files: {
        Row: {
          content: string
          created_at: string
          dialect_slug: string | null
          dialect_version: string | null
          folder_id: string | null
          id: string
          is_active: boolean
          is_open: boolean
          language: string
          lib_pins: string[] | null
          name: string
          runtime: string | null
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          dialect_slug?: string | null
          dialect_version?: string | null
          folder_id?: string | null
          id?: string
          is_active?: boolean
          is_open?: boolean
          language?: string
          lib_pins?: string[] | null
          name: string
          runtime?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          dialect_slug?: string | null
          dialect_version?: string | null
          folder_id?: string | null
          id?: string
          is_active?: boolean
          is_open?: boolean
          language?: string
          lib_pins?: string[] | null
          name?: string
          runtime?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      core_requests: {
        Row: {
          created_at: string
          extension_id: string | null
          id: string
          rationale: string | null
          source: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extension_id?: string | null
          id?: string
          rationale?: string | null
          source: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          extension_id?: string | null
          id?: string
          rationale?: string | null
          source?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_requests_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "sdev_extensions"
            referencedColumns: ["id"]
          },
        ]
      }
      dialect_docs: {
        Row: {
          content: string
          created_at: string
          dialect_id: string
          dialect_version: string
          id: string
          stale: boolean
          template_version: string
        }
        Insert: {
          content: string
          created_at?: string
          dialect_id: string
          dialect_version: string
          id?: string
          stale?: boolean
          template_version: string
        }
        Update: {
          content?: string
          created_at?: string
          dialect_id?: string
          dialect_version?: string
          id?: string
          stale?: boolean
          template_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "dialect_docs_dialect_id_fkey"
            columns: ["dialect_id"]
            isOneToOne: false
            referencedRelation: "dialects"
            referencedColumns: ["id"]
          },
        ]
      }
      dialect_versions: {
        Row: {
          created_at: string
          dialect_id: string
          id: string
          spec: Json
          version: string
        }
        Insert: {
          created_at?: string
          dialect_id: string
          id?: string
          spec: Json
          version: string
        }
        Update: {
          created_at?: string
          dialect_id?: string
          id?: string
          spec?: Json
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "dialect_versions_dialect_id_fkey"
            columns: ["dialect_id"]
            isOneToOne: false
            referencedRelation: "dialects"
            referencedColumns: ["id"]
          },
        ]
      }
      dialects: {
        Row: {
          created_at: string
          description: string | null
          extends_slug: string | null
          id: string
          install_count: number
          languages: string[]
          latest_version: string
          name: string
          share_code: string
          slug: string
          spec: Json
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          extends_slug?: string | null
          id?: string
          install_count?: number
          languages?: string[]
          latest_version?: string
          name: string
          share_code?: string
          slug: string
          spec: Json
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          extends_slug?: string | null
          id?: string
          install_count?: number
          languages?: string[]
          latest_version?: string
          name?: string
          share_code?: string
          slug?: string
          spec?: Json
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
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
      folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      gists: {
        Row: {
          content: string
          created_at: string
          description: string | null
          id: string
          language: string
          slug: string
          title: string
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          content: string
          created_at?: string
          description?: string | null
          id?: string
          language?: string
          slug?: string
          title: string
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          language?: string
          slug?: string
          title?: string
          updated_at?: string
          user_id?: string
          view_count?: number
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          max_uses: number
          note: string | null
          uses: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          max_uses?: number
          note?: string | null
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          max_uses?: number
          note?: string | null
          uses?: number
        }
        Relationships: []
      }
      libraries: {
        Row: {
          created_at: string
          description: string | null
          download_count: number
          id: string
          latest_version: string
          name: string
          slug: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          download_count?: number
          id?: string
          latest_version?: string
          name: string
          slug: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          download_count?: number
          id?: string
          latest_version?: string
          name?: string
          slug?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      library_versions: {
        Row: {
          created_at: string
          id: string
          library_id: string
          manifest: Json
          modules: Json
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          library_id: string
          manifest?: Json
          modules: Json
          version: string
        }
        Update: {
          created_at?: string
          id?: string
          library_id?: string
          manifest?: Json
          modules?: Json
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_versions_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      run_history: {
        Row: {
          code_snippet: string
          created_at: string
          duration_ms: number | null
          file_name: string | null
          id: string
          output: string | null
          status: string
          user_id: string
        }
        Insert: {
          code_snippet: string
          created_at?: string
          duration_ms?: number | null
          file_name?: string | null
          id?: string
          output?: string | null
          status?: string
          user_id: string
        }
        Update: {
          code_snippet?: string
          created_at?: string
          duration_ms?: number | null
          file_name?: string | null
          id?: string
          output?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      sdev_extensions: {
        Row: {
          about: string | null
          created_at: string
          id: string
          kind: string
          name: string
          precedence: number | null
          source: string
          symbol: string | null
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          about?: string | null
          created_at?: string
          id?: string
          kind?: string
          name: string
          precedence?: number | null
          source: string
          symbol?: string | null
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          about?: string | null
          created_at?: string
          id?: string
          kind?: string
          name?: string
          precedence?: number | null
          source?: string
          symbol?: string | null
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      starred_snippets: {
        Row: {
          created_at: string
          gist_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gist_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gist_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "starred_snippets_gist_id_fkey"
            columns: ["gist_id"]
            isOneToOne: false
            referencedRelation: "gists"
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usernames: {
        Row: {
          created_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      redeem_invite: { Args: { _code: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
