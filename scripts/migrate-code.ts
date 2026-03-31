import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function migrate() {
  const sql = neon(process.env.DATABASE_URL);

  try {
    // Check existing records
    const records = await sql`SELECT id FROM inspection_records LIMIT 1` as any[];
    console.log('Found records, proceeding with migration');

    // Add column
    try {
      await sql`ALTER TABLE inspection_records ADD COLUMN code VARCHAR(20) NOT NULL DEFAULT 'TAIYO00'`;
      console.log('Column added');
    } catch (e: any) {
      if (e.message.includes('already exists') || e.message.includes('duplicate')) {
        console.log('Column already exists');
      } else {
        throw e;
      }
    }

    // Update existing records using a CTE with row_number
    try {
      await sql`
        WITH numbered AS (
          SELECT id, 'TAIYO' || LPAD(CAST(ROW_NUMBER() OVER (ORDER BY created_at) AS VARCHAR), 2, '0') as new_code
          FROM inspection_records
          WHERE code = 'TAIYO00' OR code IS NULL
        )
        UPDATE inspection_records SET code = numbered.new_code FROM numbered WHERE inspection_records.id = numbered.id
      `;
      console.log('Codes updated');
    } catch (e: any) {
      console.log('Update note:', e.message);
    }

    // Verify
    const updated = await sql`SELECT id, code FROM inspection_records LIMIT 5` as any[];
    console.log('After migration:', JSON.stringify(updated, null, 2));

    console.log('Migration completed');
  } catch (e: any) {
    console.error('Migration failed:', e.message);
  }
}

migrate();