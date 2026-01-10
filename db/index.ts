import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Smart connection selection:
// - Prefer pooled (DATABASE_URL) for runtime efficiency
// - Fall back to direct (DIRECT_URL) for development
const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error(
    'Database connection string not found. Set DATABASE_URL or DIRECT_URL environment variable.'
  );
}

// postgres-js client with prepare mode for PgBouncer compatibility
const client = postgres(connectionString, {
  prepare: false, // Disable prepared statements for PgBouncer transaction mode
  max: 10, // Connection pool size
});

export const db = drizzle(client, { schema });

// Export for use in tests or scripts that need direct client access
export { client };
