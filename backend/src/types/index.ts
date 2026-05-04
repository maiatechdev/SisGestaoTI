export type Role = 'user' | 'ti' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  created_at: string;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  user_id: number;
  assigned_to: number | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  ticket_id: number;
  user_id: number;
  content: string;
  created_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  created_by: number;
  reviewed_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface JwtPayload {
  id: number;
  name: string;
  email: string;
  role: Role;
}
