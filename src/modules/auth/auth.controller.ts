import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcryptjs';
import { query } from '../../utils/db';
import { signToken } from '../../utils/jwt';
import { sendSuccess, sendError } from '../../utils/response';
import { SignupBody, LoginBody, UserRow, PublicUser } from './auth.types';

const SALT_ROUNDS = 10;
const VALID_ROLES = ['contributor', 'maintainer'];

/** Strip password from a UserRow before sending to client */
const toPublicUser = (user: UserRow): PublicUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  created_at: user.created_at,
  updated_at: user.updated_at,
});

export const signup = async (
  req: Request<object, object, SignupBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password, role = 'contributor' } = req.body;

    // --- Validation ---
    if (!name || !email || !password) {
      sendError(res, StatusCodes.BAD_REQUEST, 'name, email, and password are required.');
      return;
    }

    if (!VALID_ROLES.includes(role)) {
      sendError(res, StatusCodes.BAD_REQUEST, `role must be one of: ${VALID_ROLES.join(', ')}.`);
      return;
    }

    // --- Check for duplicate email ---
    const existing = await query<UserRow>('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount && existing.rowCount > 0) {
      sendError(res, StatusCodes.BAD_REQUEST, 'An account with this email already exists.');
      return;
    }

    // --- Hash password ---
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // --- Insert user ---
    const result = await query<UserRow>(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, email, hashedPassword, role]
    );

    sendSuccess(res, StatusCodes.CREATED, 'User registered successfully', toPublicUser(result.rows[0]));
  } catch (err) {
    next(err);
  }
};

export const login = async (
  req: Request<object, object, LoginBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // --- Validation ---
    if (!email || !password) {
      sendError(res, StatusCodes.BAD_REQUEST, 'email and password are required.');
      return;
    }

    // --- Find user ---
    const result = await query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rowCount || result.rowCount === 0) {
      sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid email or password.');
      return;
    }

    const user = result.rows[0];

    // --- Compare password ---
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid email or password.');
      return;
    }

    // --- Sign token ---
    const token = signToken({ id: user.id, name: user.name, role: user.role });

    sendSuccess(res, StatusCodes.OK, 'Login successful', {
      token,
      user: toPublicUser(user),
    });
  } catch (err) {
    next(err);
  }
};
