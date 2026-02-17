import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'cardinaltalent',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting database migration...');

    // Ensure migration tracking table exists (production-safe: run only new migrations)
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        run_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 1. Run full schema first (fresh DB gets base tables; existing DB is no-op due to IF NOT EXISTS)
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schema);

    // 2. Run only migration files that haven't been applied yet
    const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

      const { rows: applied } = await client.query(
        'SELECT filename FROM schema_migrations'
      );
      const appliedSet = new Set(applied.map((r) => r.filename));

      for (const file of files) {
        if (appliedSet.has(file)) {
          console.log(`  - ${file} (already applied)`);
          continue;
        }
        const migrationPath = path.join(migrationsDir, file);
        const migration = fs.readFileSync(migrationPath, 'utf8');
        await client.query(migration);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        console.log(`  ✓ ${file}`);
      }
    }

    console.log('✅ Database migration completed successfully!');
    console.log('\nDefault admin user created:');
    console.log('  Email: admin@cardinaltalent.com');
    console.log('  Password: admin123');
    console.log('  ⚠️  PLEASE CHANGE THE DEFAULT PASSWORD IN PRODUCTION!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((err) => {
  console.error(err);
  process.exit(1);
});
