import pool from './db';

const initDb = async (): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(255) NOT NULL,
        email       VARCHAR(255) NOT NULL UNIQUE,
        password    VARCHAR(255) NOT NULL,
        role        VARCHAR(20) NOT NULL DEFAULT 'contributor'
                    CHECK (role IN ('contributor', 'maintainer')),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Create issues table
    await client.query(`
      CREATE TABLE IF NOT EXISTS issues (
        id           SERIAL PRIMARY KEY,
        title        VARCHAR(150) NOT NULL,
        description  TEXT NOT NULL,
        type         VARCHAR(20) NOT NULL
                     CHECK (type IN ('bug', 'feature_request')),
        status       VARCHAR(20) NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open', 'in_progress', 'resolved')),
        reporter_id  INTEGER NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Database tables initialized successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Database initialization failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

initDb().catch(() => process.exit(1));
