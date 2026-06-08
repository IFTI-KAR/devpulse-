export interface SignupBody {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}
