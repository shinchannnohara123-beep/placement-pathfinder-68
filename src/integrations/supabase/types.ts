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
      applications: {
        Row: {
          applied_date: string | null
          company_id: string | null
          company_name: string
          created_at: string
          id: string
          location: string | null
          next_step: string | null
          next_step_date: string | null
          notes: string | null
          package_lpa: number | null
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_date?: string | null
          company_id?: string | null
          company_name: string
          created_at?: string
          id?: string
          location?: string | null
          next_step?: string | null
          next_step_date?: string | null
          notes?: string | null
          package_lpa?: number | null
          role: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_date?: string | null
          company_id?: string | null
          company_name?: string
          created_at?: string
          id?: string
          location?: string | null
          next_step?: string | null
          next_step_date?: string | null
          notes?: string | null
          package_lpa?: number | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          allowed_branches: string[] | null
          careers_url: string | null
          created_at: string
          cs_subjects: string[] | null
          description: string | null
          dsa_topics: string[] | null
          field_sources: Json
          hiring_season: string | null
          hq_location: string | null
          id: string
          industry: string | null
          last_verified_at: string | null
          logo_url: string | null
          min_cgpa: number | null
          name: string
          process_steps: string[] | null
          salary_max: number | null
          salary_min: number | null
          slug: string
          source_name: string | null
          source_url: string | null
          tech_stack: string[] | null
          verification_status: string
          website: string | null
        }
        Insert: {
          allowed_branches?: string[] | null
          careers_url?: string | null
          created_at?: string
          cs_subjects?: string[] | null
          description?: string | null
          dsa_topics?: string[] | null
          field_sources?: Json
          hiring_season?: string | null
          hq_location?: string | null
          id?: string
          industry?: string | null
          last_verified_at?: string | null
          logo_url?: string | null
          min_cgpa?: number | null
          name: string
          process_steps?: string[] | null
          salary_max?: number | null
          salary_min?: number | null
          slug: string
          source_name?: string | null
          source_url?: string | null
          tech_stack?: string[] | null
          verification_status?: string
          website?: string | null
        }
        Update: {
          allowed_branches?: string[] | null
          careers_url?: string | null
          created_at?: string
          cs_subjects?: string[] | null
          description?: string | null
          dsa_topics?: string[] | null
          field_sources?: Json
          hiring_season?: string | null
          hq_location?: string | null
          id?: string
          industry?: string | null
          last_verified_at?: string | null
          logo_url?: string | null
          min_cgpa?: number | null
          name?: string
          process_steps?: string[] | null
          salary_max?: number | null
          salary_min?: number | null
          slug?: string
          source_name?: string | null
          source_url?: string | null
          tech_stack?: string[] | null
          verification_status?: string
          website?: string | null
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          apply_url: string | null
          branches: string[] | null
          category: string
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          education_level: string | null
          eligibility: Json
          eligibility_text: string | null
          graduation_years: number[] | null
          id: string
          last_verified_at: string | null
          location: string | null
          min_cgpa: number | null
          organization: string
          source_name: string | null
          source_url: string | null
          state: string | null
          title: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          apply_url?: string | null
          branches?: string[] | null
          category: string
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          education_level?: string | null
          eligibility?: Json
          eligibility_text?: string | null
          graduation_years?: number[] | null
          id?: string
          last_verified_at?: string | null
          location?: string | null
          min_cgpa?: number | null
          organization: string
          source_name?: string | null
          source_url?: string | null
          state?: string | null
          title: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          apply_url?: string | null
          branches?: string[] | null
          category?: string
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          education_level?: string | null
          eligibility?: Json
          eligibility_text?: string | null
          graduation_years?: number[] | null
          id?: string
          last_verified_at?: string | null
          location?: string | null
          min_cgpa?: number | null
          organization?: string
          source_name?: string | null
          source_url?: string | null
          state?: string | null
          title?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          achievements: string | null
          branch: string | null
          career_interests: string[] | null
          certifications: Json
          cgpa: number | null
          coding_profiles: Json
          college: string | null
          course: string | null
          created_at: string
          current_semester: number | null
          degree: string | null
          dream_companies: string[] | null
          email: string | null
          full_name: string | null
          graduation_year: number | null
          id: string
          preferred_roles: string[] | null
          projects: Json
          skills: string[] | null
          state: string | null
          target_cgpa: number | null
          university: string | null
          updated_at: string
          year_of_study: number | null
        }
        Insert: {
          achievements?: string | null
          branch?: string | null
          career_interests?: string[] | null
          certifications?: Json
          cgpa?: number | null
          coding_profiles?: Json
          college?: string | null
          course?: string | null
          created_at?: string
          current_semester?: number | null
          degree?: string | null
          dream_companies?: string[] | null
          email?: string | null
          full_name?: string | null
          graduation_year?: number | null
          id: string
          preferred_roles?: string[] | null
          projects?: Json
          skills?: string[] | null
          state?: string | null
          target_cgpa?: number | null
          university?: string | null
          updated_at?: string
          year_of_study?: number | null
        }
        Update: {
          achievements?: string | null
          branch?: string | null
          career_interests?: string[] | null
          certifications?: Json
          cgpa?: number | null
          coding_profiles?: Json
          college?: string | null
          course?: string | null
          created_at?: string
          current_semester?: number | null
          degree?: string | null
          dream_companies?: string[] | null
          email?: string | null
          full_name?: string | null
          graduation_year?: number | null
          id?: string
          preferred_roles?: string[] | null
          projects?: Json
          skills?: string[] | null
          state?: string | null
          target_cgpa?: number | null
          university?: string | null
          updated_at?: string
          year_of_study?: number | null
        }
        Relationships: []
      }
      resume_versions: {
        Row: {
          ai_suggested: Json
          created_at: string
          id: string
          label: string
          sections: Json
          target_role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_suggested?: Json
          created_at?: string
          id?: string
          label: string
          sections?: Json
          target_role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_suggested?: Json
          created_at?: string
          id?: string
          label?: string
          sections?: Json
          target_role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resumes: {
        Row: {
          ats_score: number | null
          created_at: string
          file_path: string
          id: string
          is_primary: boolean
          label: string
          size_bytes: number | null
          user_id: string
        }
        Insert: {
          ats_score?: number | null
          created_at?: string
          file_path: string
          id?: string
          is_primary?: boolean
          label: string
          size_bytes?: number | null
          user_id: string
        }
        Update: {
          ats_score?: number | null
          created_at?: string
          file_path?: string
          id?: string
          is_primary?: boolean
          label?: string
          size_bytes?: number | null
          user_id?: string
        }
        Relationships: []
      }
      roadmap_progress: {
        Row: {
          completed_milestones: string[] | null
          created_at: string
          id: string
          progress: number
          stage_key: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_milestones?: string[] | null
          created_at?: string
          id?: string
          progress?: number
          stage_key: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_milestones?: string[] | null
          created_at?: string
          id?: string
          progress?: number
          stage_key?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_opportunities: {
        Row: {
          created_at: string
          id: string
          opportunity_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          opportunity_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_opportunities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      semesters: {
        Row: {
          created_at: string
          credits_earned: number | null
          id: string
          semester_number: number
          sgpa: number | null
          total_credits: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_earned?: number | null
          id?: string
          semester_number: number
          sgpa?: number | null
          total_credits?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_earned?: number | null
          id?: string
          semester_number?: number
          sgpa?: number | null
          total_credits?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string
          credits: number | null
          difficulty: number | null
          exam_date: string | null
          external_marks: number | null
          id: string
          internal_marks: number | null
          interview_topics: string[] | null
          name: string
          notes: string | null
          progress: number
          semester_number: number | null
          target_grade: string | null
          topics: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          credits?: number | null
          difficulty?: number | null
          exam_date?: string | null
          external_marks?: number | null
          id?: string
          internal_marks?: number | null
          interview_topics?: string[] | null
          name: string
          notes?: string | null
          progress?: number
          semester_number?: number | null
          target_grade?: string | null
          topics?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          credits?: number | null
          difficulty?: number | null
          exam_date?: string | null
          external_marks?: number | null
          id?: string
          internal_marks?: number | null
          interview_topics?: string[] | null
          name?: string
          notes?: string | null
          progress?: number
          semester_number?: number | null
          target_grade?: string | null
          topics?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string
          due_date: string
          due_time: string | null
          id: string
          is_done: boolean
          notes: string | null
          priority: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          completed_at?: string | null
          created_at?: string
          due_date?: string
          due_time?: string | null
          id?: string
          is_done?: boolean
          notes?: string | null
          priority?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string
          due_date?: string
          due_time?: string | null
          id?: string
          is_done?: boolean
          notes?: string | null
          priority?: string
          title?: string
          updated_at?: string
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
