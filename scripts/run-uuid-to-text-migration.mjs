import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const migrationFile = join(__dirname, '..', 'supabase', 'migrations', '20260331000002_alter_uuid_to_text.sql');
const migrationSQL = readFileSync(migrationFile, 'utf-8');

// Split by statement breakpoint or semicolons, filter empty
const statements = migrationSQL
  .split(/\n/)
  .filter(line => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith('--');
  })
  .join('\n')
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

console.log(`Running ${statements.length} migration statements...`);

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  try {
    await sql(stmt);
    console.log(`  [${i + 1}/${statements.length}] OK`);
  } catch (err) {
    console.error(`  [${i + 1}/${statements.length}] FAILED: ${err.message}`);
    console.error(`  Statement: ${stmt.substring(0, 100)}...`);
    // Continue with remaining statements (some constraints might not exist)
  }
}

console.log('Migration complete.');

// Verify by checking column types
const result = await sql`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'inspection_records'
  ORDER BY ordinal_position
`;
console.log('\ninspection_records schema after migration:');
for (const row of result) {
  console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'})`);
}
