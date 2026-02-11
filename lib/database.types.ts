export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          clerk_id: string
          email: string | null
          first_name: string | null
          last_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clerk_id: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clerk_id?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          id: string
          owner_clerk_id: string
          title: string
          share_id: string
          status: 'active' | 'locked' | 'deleted'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_clerk_id: string
          title: string
          share_id: string
          status?: 'active' | 'locked' | 'deleted'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_clerk_id?: string
          title?: string
          share_id?: string
          status?: 'active' | 'locked' | 'deleted'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'plans_owner_clerk_id_fkey'
            columns: ['owner_clerk_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['clerk_id']
          }
        ]
      }
      plan_dates: {
        Row: {
          id: string
          plan_id: string
          date: string
          status: 'viable' | 'eliminated' | 'locked' | 'reopened'
          reopen_version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          date: string
          status?: 'viable' | 'eliminated' | 'locked' | 'reopened'
          reopen_version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          date?: string
          status?: 'viable' | 'eliminated' | 'locked' | 'reopened'
          reopen_version?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'plan_dates_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'plans'
            referencedColumns: ['id']
          }
        ]
      }
      participants: {
        Row: {
          id: string
          plan_id: string
          display_name: string
          is_done: boolean
          needs_review: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          display_name: string
          is_done?: boolean
          needs_review?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          display_name?: string
          is_done?: boolean
          needs_review?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'participants_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'plans'
            referencedColumns: ['id']
          }
        ]
      }
      availability: {
        Row: {
          id: string
          participant_id: string
          plan_date_id: string
          status: 'available' | 'unavailable'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          participant_id: string
          plan_date_id: string
          status?: 'available' | 'unavailable'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          participant_id?: string
          plan_date_id?: string
          status?: 'available' | 'unavailable'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'availability_participant_id_fkey'
            columns: ['participant_id']
            isOneToOne: false
            referencedRelation: 'participants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'availability_plan_date_id_fkey'
            columns: ['plan_date_id']
            isOneToOne: false
            referencedRelation: 'plan_dates'
            referencedColumns: ['id']
          }
        ]
      }
      event_log: {
        Row: {
          id: string
          plan_id: string
          participant_id: string | null
          event_type: string
          metadata: Json
          undo_deadline: string | null
          created_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          participant_id?: string | null
          event_type: string
          metadata?: Json
          undo_deadline?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          participant_id?: string | null
          event_type?: string
          metadata?: Json
          undo_deadline?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'event_log_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'plans'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_log_participant_id_fkey'
            columns: ['participant_id']
            isOneToOne: false
            referencedRelation: 'participants'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      plan_status: 'active' | 'locked' | 'deleted'
      date_status: 'viable' | 'eliminated' | 'locked' | 'reopened'
      availability_status: 'available' | 'unavailable'
    }
  }
}
