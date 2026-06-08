import pool from '../config/db';
import { QueryResult, QueryResultRow } from 'pg';

/**
 * Execute a parameterized SQL query against the connection pool.
 * Centralizes all database access in one place.
 */
export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params);
};
