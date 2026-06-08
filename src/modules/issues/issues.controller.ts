import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { query } from '../../utils/db';
import { sendSuccess, sendError } from '../../utils/response';
import {
  IssueRow,
  ReporterRow,
  IssueWithReporter,
  CreateIssueBody,
  UpdateIssueBody,
  IssueQueryParams,
} from './issues.types';

const VALID_TYPES = ['bug', 'feature_request'];
const VALID_STATUSES = ['open', 'in_progress', 'resolved'];

/** Fetch reporter details for a list of reporter IDs (no JOINs — two separate queries) */
const fetchReporters = async (reporterIds: number[]): Promise<Map<number, ReporterRow>> => {
  if (reporterIds.length === 0) return new Map();

  // Use WHERE id IN (...) batch query instead of N individual queries
  const placeholders = reporterIds.map((_, i) => `$${i + 1}`).join(', ');
  const result = await query<ReporterRow>(
    `SELECT id, name, role FROM users WHERE id IN (${placeholders})`,
    reporterIds
  );

  const map = new Map<number, ReporterRow>();
  for (const row of result.rows) {
    map.set(row.id, row);
  }
  return map;
};

/** Attach reporter object to an issue row */
const attachReporter = (issue: IssueRow, reporterMap: Map<number, ReporterRow>): IssueWithReporter => {
  const reporter = reporterMap.get(issue.reporter_id) ?? {
    id: issue.reporter_id,
    name: 'Unknown',
    role: 'contributor',
  };
  return {
    id: issue.id,
    title: issue.title,
    description: issue.description,
    type: issue.type,
    status: issue.status,
    reporter,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
  };
};

// ─── CREATE ISSUE ────────────────────────────────────────────────────────────

export const createIssue = async (
  req: Request<object, object, CreateIssueBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, description, type } = req.body;
    const reporterId = req.user!.id;

    // --- Validation ---
    if (!title || !description || !type) {
      sendError(res, StatusCodes.BAD_REQUEST, 'title, description, and type are required.');
      return;
    }
    if (title.length > 150) {
      sendError(res, StatusCodes.BAD_REQUEST, 'title must be 150 characters or fewer.');
      return;
    }
    if (description.length < 20) {
      sendError(res, StatusCodes.BAD_REQUEST, 'description must be at least 20 characters.');
      return;
    }
    if (!VALID_TYPES.includes(type)) {
      sendError(res, StatusCodes.BAD_REQUEST, `type must be one of: ${VALID_TYPES.join(', ')}.`);
      return;
    }

    const result = await query<IssueRow>(
      `INSERT INTO issues (title, description, type, reporter_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, description, type, reporterId]
    );

    sendSuccess(res, StatusCodes.CREATED, 'Issue created successfully', result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// ─── GET ALL ISSUES ──────────────────────────────────────────────────────────

export const getAllIssues = async (
  req: Request<object, object, object, IssueQueryParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sort = 'newest', type, status } = req.query;

    // Build WHERE clauses dynamically
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (type) {
      if (!VALID_TYPES.includes(type)) {
        sendError(res, StatusCodes.BAD_REQUEST, `type filter must be one of: ${VALID_TYPES.join(', ')}.`);
        return;
      }
      conditions.push(`type = $${paramIndex++}`);
      params.push(type);
    }

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        sendError(res, StatusCodes.BAD_REQUEST, `status filter must be one of: ${VALID_STATUSES.join(', ')}.`);
        return;
      }
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderClause = sort === 'oldest' ? 'ORDER BY created_at ASC' : 'ORDER BY created_at DESC';

    const issuesResult = await query<IssueRow>(
      `SELECT * FROM issues ${whereClause} ${orderClause}`,
      params
    );

    const issues = issuesResult.rows;

    // Batch fetch reporters — no JOINs per spec
    const uniqueReporterIds = [...new Set(issues.map((i) => i.reporter_id))];
    const reporterMap = await fetchReporters(uniqueReporterIds);

    const data = issues.map((issue) => attachReporter(issue, reporterMap));

    sendSuccess(res, StatusCodes.OK, 'Issues retrived successfully', data);
  } catch (err) {
    next(err);
  }
};

// ─── GET SINGLE ISSUE ────────────────────────────────────────────────────────

export const getIssueById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const issueId = parseInt(req.params.id, 10);
    if (isNaN(issueId)) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Issue ID must be a valid number.');
      return;
    }

    const issueResult = await query<IssueRow>('SELECT * FROM issues WHERE id = $1', [issueId]);
    if (!issueResult.rowCount || issueResult.rowCount === 0) {
      sendError(res, StatusCodes.NOT_FOUND, 'Issue not found.');
      return;
    }

    const issue = issueResult.rows[0];
    const reporterMap = await fetchReporters([issue.reporter_id]);
    const data = attachReporter(issue, reporterMap);

    sendSuccess(res, StatusCodes.OK, 'Issue retrived successfully', data);
  } catch (err) {
    next(err);
  }
};

// ─── UPDATE ISSUE ────────────────────────────────────────────────────────────

export const updateIssue = async (
  req: Request<{ id: string }, object, UpdateIssueBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const issueId = parseInt(req.params.id, 10);
    if (isNaN(issueId)) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Issue ID must be a valid number.');
      return;
    }

    // Fetch existing issue
    const issueResult = await query<IssueRow>('SELECT * FROM issues WHERE id = $1', [issueId]);
    if (!issueResult.rowCount || issueResult.rowCount === 0) {
      sendError(res, StatusCodes.NOT_FOUND, 'Issue not found.');
      return;
    }

    const issue = issueResult.rows[0];
    const { role, id: userId } = req.user!;

    // --- Permission check ---
    if (role === 'contributor') {
      if (issue.reporter_id !== userId) {
        sendError(res, StatusCodes.FORBIDDEN, 'You can only update your own issues.');
        return;
      }
      if (issue.status !== 'open') {
        sendError(res, StatusCodes.CONFLICT, 'Contributors can only update issues with status "open".');
        return;
      }
    }

    const { title, description, type } = req.body;

    // At least one field must be provided
    if (!title && !description && !type) {
      sendError(res, StatusCodes.BAD_REQUEST, 'At least one of title, description, or type must be provided.');
      return;
    }

    // Validate provided fields
    if (title !== undefined && title.length > 150) {
      sendError(res, StatusCodes.BAD_REQUEST, 'title must be 150 characters or fewer.');
      return;
    }
    if (description !== undefined && description.length < 20) {
      sendError(res, StatusCodes.BAD_REQUEST, 'description must be at least 20 characters.');
      return;
    }
    if (type !== undefined && !VALID_TYPES.includes(type)) {
      sendError(res, StatusCodes.BAD_REQUEST, `type must be one of: ${VALID_TYPES.join(', ')}.`);
      return;
    }

    // Build SET clause dynamically — only update provided fields
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      params.push(title);
    }
    if (description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      params.push(description);
    }
    if (type !== undefined) {
      setClauses.push(`type = $${paramIndex++}`);
      params.push(type);
    }

    setClauses.push(`updated_at = NOW()`);
    params.push(issueId);

    const updateResult = await query<IssueRow>(
      `UPDATE issues SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    sendSuccess(res, StatusCodes.OK, 'Issue updated successfully', updateResult.rows[0]);
  } catch (err) {
    next(err);
  }
};

// ─── DELETE ISSUE ────────────────────────────────────────────────────────────

export const deleteIssue = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const issueId = parseInt(req.params.id, 10);
    if (isNaN(issueId)) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Issue ID must be a valid number.');
      return;
    }

    const result = await query<IssueRow>('DELETE FROM issues WHERE id = $1 RETURNING id', [issueId]);
    if (!result.rowCount || result.rowCount === 0) {
      sendError(res, StatusCodes.NOT_FOUND, 'Issue not found.');
      return;
    }

    sendSuccess(res, StatusCodes.OK, 'Issue deleted successfully');
  } catch (err) {
    next(err);
  }
};
