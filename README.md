# DevPulse API

> Internal Tech Issue & Feature Tracker — a collaborative platform for software teams to report bugs, suggest features, and coordinate resolutions.

**Live URL:** `https://devpulse-kohl-delta.vercel.app`

---

## Features

- User registration & login with JWT authentication
- Role-based access control (`contributor` / `maintainer`)
- Full CRUD for issues (bug reports & feature requests)
- Filter issues by `type` and `status`; sort by `newest` or `oldest`
- Reporter details returned without SQL JOINs (two-query batch pattern)
- Centralized error handling & consistent JSON response structure

---

## Tech Stack

| Technology | Version |
|---|---|
| Node.js | 24.x LTS |
| TypeScript | 5.x |
| Express.js | 4.x |
| PostgreSQL | 15+ |
| pg (native driver) | 8.x |
| bcryptjs | 2.x |
| jsonwebtoken | 9.x |

---

## Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/IFTI-KAR/devpulse-.git
cd devpulse-

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET

# 4. Initialize database tables
npm run db:init

# 5. Start development server
npm run dev
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default: `3000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing JWTs |
| `NODE_ENV` | `development` or `production` |

---

## Database Schema

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | Auto-increment |
| `name` | VARCHAR(255) | Required |
| `email` | VARCHAR(255) | Unique, required |
| `password` | VARCHAR(255) | Bcrypt hash, never returned |
| `role` | VARCHAR(20) | `contributor` (default) or `maintainer` |
| `created_at` | TIMESTAMPTZ | Auto-set on insert |
| `updated_at` | TIMESTAMPTZ | Auto-set on insert/update |

### `issues`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | Auto-increment |
| `title` | VARCHAR(150) | Required, max 150 chars |
| `description` | TEXT | Required, min 20 chars |
| `type` | VARCHAR(20) | `bug` or `feature_request` |
| `status` | VARCHAR(20) | `open` (default), `in_progress`, `resolved` |
| `reporter_id` | INTEGER | References `users.id` (app-level validation) |
| `created_at` | TIMESTAMPTZ | Auto-set on insert |
| `updated_at` | TIMESTAMPTZ | Auto-set on insert/update |

---

## API Endpoints

### Auth

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login and receive JWT |

### Issues

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/issues` | Authenticated | Create a new issue |
| GET | `/api/issues` | Public | Get all issues (filterable) |
| GET | `/api/issues/:id` | Public | Get a single issue |
| PATCH | `/api/issues/:id` | Authenticated | Update an issue |
| DELETE | `/api/issues/:id` | Maintainer only | Delete an issue |

#### Query Parameters for `GET /api/issues`

| Param | Values | Default |
|---|---|---|
| `sort` | `newest`, `oldest` | `newest` |
| `type` | `bug`, `feature_request` | — |
| `status` | `open`, `in_progress`, `resolved` | — |

#### Authorization Header Format

```
Authorization: <JWT_TOKEN>
```

---

## Project Structure

```
src/
├── config/
│   ├── db.ts           # PostgreSQL connection pool
│   └── initDb.ts       # Table initialization script
├── middleware/
│   ├── auth.ts         # JWT verify + role guard middleware
│   └── errorHandler.ts # Centralized async error handler
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.routes.ts
│   │   └── auth.types.ts
│   └── issues/
│       ├── issues.controller.ts
│       ├── issues.routes.ts
│       └── issues.types.ts
├── utils/
│   ├── db.ts           # Thin query wrapper over pg pool
│   ├── jwt.ts          # signToken / verifyToken helpers
│   └── response.ts     # sendSuccess / sendError helpers
└── index.ts            # Express app bootstrap
```

---

## Deployment to Vercel

1. Push code to your GitHub repository:
   ```bash
   git push -u origin main
   ```
2. Make sure `api/index.ts` and `vercel.json` are present.
3. Deploy to Vercel via Vercel CLI:
   ```bash
   vercel --prod
   ```
4. Set the environment variables in the Vercel project settings:
   - `DATABASE_URL` (your NeonDB or PostgreSQL database connection string)
   - `JWT_SECRET` (your JWT signature secret)
   - `NODE_ENV` (`production`)

