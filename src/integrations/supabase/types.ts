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
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_broadcasts: {
        Row: {
          audience: string
          body_md: string
          created_at: string
          created_by: string | null
          custom_emails: string[]
          failed_count: number
          id: string
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number
          status: string
          subject: string
          topics_filter: string[]
          total_recipients: number
          updated_at: string
        }
        Insert: {
          audience: string
          body_md: string
          created_at?: string
          created_by?: string | null
          custom_emails?: string[]
          failed_count?: number
          id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject: string
          topics_filter?: string[]
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          audience?: string
          body_md?: string
          created_at?: string
          created_by?: string | null
          custom_emails?: string[]
          failed_count?: number
          id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject?: string
          topics_filter?: string[]
          total_recipients?: number
          updated_at?: string
        }
        Relationships: []
      }
      admin_popups: {
        Row: {
          body_md: string | null
          created_at: string
          created_by: string | null
          cta_label: string
          enabled: boolean
          ends_at: string | null
          fields: Json
          id: string
          slug: string
          starts_at: string | null
          subtitle: string | null
          success_message: string
          targeting: Json
          theme: Json
          title: string
          topics: string[]
          updated_at: string
        }
        Insert: {
          body_md?: string | null
          created_at?: string
          created_by?: string | null
          cta_label?: string
          enabled?: boolean
          ends_at?: string | null
          fields?: Json
          id?: string
          slug: string
          starts_at?: string | null
          subtitle?: string | null
          success_message?: string
          targeting?: Json
          theme?: Json
          title: string
          topics?: string[]
          updated_at?: string
        }
        Update: {
          body_md?: string | null
          created_at?: string
          created_by?: string | null
          cta_label?: string
          enabled?: boolean
          ends_at?: string | null
          fields?: Json
          id?: string
          slug?: string
          starts_at?: string | null
          subtitle?: string | null
          success_message?: string
          targeting?: Json
          theme?: Json
          title?: string
          topics?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          read_at: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          read_at?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          read_at?: string | null
          subject?: string | null
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
      newsletter_subscribers: {
        Row: {
          confirmed_at: string | null
          created_at: string
          email: string
          id: string
          last_digest_sent_at: string | null
          source: string | null
          topics: string[]
          unsubscribe_token: string
          unsubscribed_at: string | null
          user_id: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: string
          last_digest_sent_at?: string | null
          source?: string | null
          topics?: string[]
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          user_id?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          last_digest_sent_at?: string | null
          source?: string | null
          topics?: string[]
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      portfolio_holdings: {
        Row: {
          asset_type: Database["public"]["Enums"]["holding_asset_type"]
          avg_cost_usd: number | null
          avg_cost_vnd: number | null
          created_at: string
          id: string
          note: string | null
          quantity: number
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_type: Database["public"]["Enums"]["holding_asset_type"]
          avg_cost_usd?: number | null
          avg_cost_vnd?: number | null
          created_at?: string
          id?: string
          note?: string | null
          quantity: number
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["holding_asset_type"]
          avg_cost_usd?: number | null
          avg_cost_vnd?: number | null
          created_at?: string
          id?: string
          note?: string | null
          quantity?: number
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_transactions: {
        Row: {
          asset_type: Database["public"]["Enums"]["holding_asset_type"]
          created_at: string
          executed_at: string
          fee_vnd: number
          id: string
          note: string | null
          price_usd: number | null
          price_vnd: number | null
          quantity: number
          side: Database["public"]["Enums"]["transaction_side"]
          symbol: string
          user_id: string
        }
        Insert: {
          asset_type: Database["public"]["Enums"]["holding_asset_type"]
          created_at?: string
          executed_at?: string
          fee_vnd?: number
          id?: string
          note?: string | null
          price_usd?: number | null
          price_vnd?: number | null
          quantity: number
          side: Database["public"]["Enums"]["transaction_side"]
          symbol: string
          user_id: string
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["holding_asset_type"]
          created_at?: string
          executed_at?: string
          fee_vnd?: number
          id?: string
          note?: string | null
          price_usd?: number | null
          price_vnd?: number | null
          quantity?: number
          side?: Database["public"]["Enums"]["transaction_side"]
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      price_cache: {
        Row: {
          key: string
          payload: Json
          updated_at: string
        }
        Insert: {
          key: string
          payload: Json
          updated_at?: string
        }
        Update: {
          key?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          last_login_at: string | null
          last_login_ip: string | null
          locale: string | null
          security_alerts_enabled: boolean
          updated_at: string
          watchlist_alerts_global_enabled: boolean
          welcome_email_sent_at: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          last_login_at?: string | null
          last_login_ip?: string | null
          locale?: string | null
          security_alerts_enabled?: boolean
          updated_at?: string
          watchlist_alerts_global_enabled?: boolean
          welcome_email_sent_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          last_login_ip?: string | null
          locale?: string | null
          security_alerts_enabled?: boolean
          updated_at?: string
          watchlist_alerts_global_enabled?: boolean
          welcome_email_sent_at?: string | null
        }
        Relationships: []
      }
      savings_rates_snapshot: {
        Row: {
          fetched_at: string
          id: string
          payload: Json
          source: string
          updated_at: string
        }
        Insert: {
          fetched_at?: string
          id?: string
          payload: Json
          source: string
          updated_at?: string
        }
        Update: {
          fetched_at?: string
          id?: string
          payload?: Json
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_audit_runs: {
        Row: {
          error_message: string | null
          finished_at: string | null
          id: string
          search_perf: Json | null
          sitemap_status: Json | null
          started_at: string
          status: string
          total_urls: number
          trigger: string
          urls_with_issues: number
        }
        Insert: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          search_perf?: Json | null
          sitemap_status?: Json | null
          started_at?: string
          status?: string
          total_urls?: number
          trigger?: string
          urls_with_issues?: number
        }
        Update: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          search_perf?: Json | null
          sitemap_status?: Json | null
          started_at?: string
          status?: string
          total_urls?: number
          trigger?: string
          urls_with_issues?: number
        }
        Relationships: []
      }
      seo_audit_url_results: {
        Row: {
          amp_verdict: string | null
          coverage_state: string | null
          created_at: string
          google_canonical: string | null
          id: string
          indexing_state: string | null
          issues: string[]
          last_crawl_time: string | null
          mobile_verdict: string | null
          page_fetch_state: string | null
          raw: Json | null
          rich_results_verdict: string | null
          robots_txt_state: string | null
          run_id: string
          url: string
          user_canonical: string | null
          verdict: string | null
        }
        Insert: {
          amp_verdict?: string | null
          coverage_state?: string | null
          created_at?: string
          google_canonical?: string | null
          id?: string
          indexing_state?: string | null
          issues?: string[]
          last_crawl_time?: string | null
          mobile_verdict?: string | null
          page_fetch_state?: string | null
          raw?: Json | null
          rich_results_verdict?: string | null
          robots_txt_state?: string | null
          run_id: string
          url: string
          user_canonical?: string | null
          verdict?: string | null
        }
        Update: {
          amp_verdict?: string | null
          coverage_state?: string | null
          created_at?: string
          google_canonical?: string | null
          id?: string
          indexing_state?: string | null
          issues?: string[]
          last_crawl_time?: string | null
          mobile_verdict?: string | null
          page_fetch_state?: string | null
          raw?: Json | null
          rich_results_verdict?: string | null
          robots_txt_state?: string | null
          run_id?: string
          url?: string
          user_canonical?: string | null
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_audit_url_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "seo_audit_runs"
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
      user_cookie_consent: {
        Row: {
          accepted_at: string
          prefs: Json
          updated_at: string
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          prefs: Json
          updated_at?: string
          user_agent?: string | null
          user_id: string
          version: string
        }
        Update: {
          accepted_at?: string
          prefs?: Json
          updated_at?: string
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      user_mfa: {
        Row: {
          authenticator_id: string | null
          authsignal_user_id: string
          backup_codes: string[]
          created_at: string
          enrolled: boolean
          enrolled_at: string | null
          totp_secret: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          authenticator_id?: string | null
          authsignal_user_id: string
          backup_codes?: string[]
          created_at?: string
          enrolled?: boolean
          enrolled_at?: string | null
          totp_secret?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          authenticator_id?: string | null
          authsignal_user_id?: string
          backup_codes?: string[]
          created_at?: string
          enrolled?: boolean
          enrolled_at?: string | null
          totp_secret?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_mfa_methods: {
        Row: {
          authenticator_id: string | null
          authsignal_user_id: string
          created_at: string
          enrolled: boolean
          enrolled_at: string | null
          fail_count: number
          id: string
          is_default: boolean
          label: string | null
          last_failed_at: string | null
          locked_until: string | null
          totp_secret: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          authenticator_id?: string | null
          authsignal_user_id: string
          created_at?: string
          enrolled?: boolean
          enrolled_at?: string | null
          fail_count?: number
          id?: string
          is_default?: boolean
          label?: string | null
          last_failed_at?: string | null
          locked_until?: string | null
          totp_secret?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          authenticator_id?: string | null
          authsignal_user_id?: string
          created_at?: string
          enrolled?: boolean
          enrolled_at?: string | null
          fail_count?: number
          id?: string
          is_default?: boolean
          label?: string | null
          last_failed_at?: string | null
          locked_until?: string | null
          totp_secret?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_price_alerts: {
        Row: {
          asset_type: Database["public"]["Enums"]["alert_asset_type"]
          created_at: string
          direction: Database["public"]["Enums"]["alert_direction"]
          email_enabled: boolean
          id: string
          last_price_usd: number | null
          symbol: string
          threshold_usd: number
          triggered: boolean
          triggered_at: string | null
          user_id: string
        }
        Insert: {
          asset_type?: Database["public"]["Enums"]["alert_asset_type"]
          created_at?: string
          direction: Database["public"]["Enums"]["alert_direction"]
          email_enabled?: boolean
          id?: string
          last_price_usd?: number | null
          symbol: string
          threshold_usd: number
          triggered?: boolean
          triggered_at?: string | null
          user_id: string
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["alert_asset_type"]
          created_at?: string
          direction?: Database["public"]["Enums"]["alert_direction"]
          email_enabled?: boolean
          id?: string
          last_price_usd?: number | null
          symbol?: string
          threshold_usd?: number
          triggered?: boolean
          triggered_at?: string | null
          user_id?: string
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
      vn_fuel_prices_history: {
        Row: {
          created_at: string
          created_by: string | null
          effective_from: string
          id: string
          rows: Json
          source: string
          source_url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_from: string
          id?: string
          rows: Json
          source?: string
          source_url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          id?: string
          rows?: Json
          source?: string
          source_url?: string
        }
        Relationships: []
      }
      vn_fuel_prices_snapshot: {
        Row: {
          effective_from: string
          id: string
          rows: Json
          source_url: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          effective_from: string
          id?: string
          rows: Json
          source_url?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          effective_from?: string
          id?: string
          rows?: Json
          source_url?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      watchlist_alert_unsubscribe_tokens: {
        Row: {
          created_at: string
          symbol: string | null
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          symbol?: string | null
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          symbol?: string | null
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      watchlist_items: {
        Row: {
          alert_threshold_pct: number
          category: string
          created_at: string
          email_alerts_enabled: boolean
          id: string
          label: string
          last_alert_price_usd: number | null
          last_alert_sent_at: string | null
          symbol: string
          to_path: string
          user_id: string
        }
        Insert: {
          alert_threshold_pct?: number
          category: string
          created_at?: string
          email_alerts_enabled?: boolean
          id?: string
          label: string
          last_alert_price_usd?: number | null
          last_alert_sent_at?: string | null
          symbol: string
          to_path: string
          user_id: string
        }
        Update: {
          alert_threshold_pct?: number
          category?: string
          created_at?: string
          email_alerts_enabled?: boolean
          id?: string
          label?: string
          last_alert_price_usd?: number | null
          last_alert_sent_at?: string | null
          symbol?: string
          to_path?: string
          user_id?: string
        }
        Relationships: []
      }
      watchlist_price_snapshots: {
        Row: {
          asset_type: string
          captured_at: string
          price_usd: number
          symbol: string
        }
        Insert: {
          asset_type: string
          captured_at?: string
          price_usd: number
          symbol: string
        }
        Update: {
          asset_type?: string
          captured_at?: string
          price_usd?: number
          symbol?: string
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
    }
    Enums: {
      alert_asset_type: "crypto" | "gold"
      alert_direction: "above" | "below"
      app_role: "admin" | "user"
      holding_asset_type: "crypto" | "gold"
      transaction_side: "buy" | "sell"
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
      alert_asset_type: ["crypto", "gold"],
      alert_direction: ["above", "below"],
      app_role: ["admin", "user"],
      holding_asset_type: ["crypto", "gold"],
      transaction_side: ["buy", "sell"],
    },
  },
} as const
