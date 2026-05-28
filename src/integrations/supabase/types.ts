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
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          subject?: string | null
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
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          locale: string | null
          updated_at: string
          welcome_email_sent_at: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          locale?: string | null
          updated_at?: string
          welcome_email_sent_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          locale?: string | null
          updated_at?: string
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
      user_mfa: {
        Row: {
          authenticator_id: string | null
          authsignal_user_id: string
          backup_codes: string[]
          created_at: string
          enrolled: boolean
          enrolled_at: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      alert_asset_type: "crypto" | "gold"
      alert_direction: "above" | "below"
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
      holding_asset_type: ["crypto", "gold"],
      transaction_side: ["buy", "sell"],
    },
  },
} as const
