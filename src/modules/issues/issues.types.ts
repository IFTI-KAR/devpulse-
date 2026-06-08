export interface IssueRow {
  id: number;
  title: string;
  description: string;
  type: string;
  status: string;
  reporter_id: number;
  created_at: string;
  updated_at: string;
}

export interface ReporterRow {
  id: number;
  name: string;
  role: string;
}

export interface IssueWithReporter {
  id: number;
  title: string;
  description: string;
  type: string;
  status: string;
  reporter: ReporterRow;
  created_at: string;
  updated_at: string;
}

export interface CreateIssueBody {
  title: string;
  description: string;
  type: string;
}

export interface UpdateIssueBody {
  title?: string;
  description?: string;
  type?: string;
}

export interface IssueQueryParams {
  sort?: string;
  type?: string;
  status?: string;
}
