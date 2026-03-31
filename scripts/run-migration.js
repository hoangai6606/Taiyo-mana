import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
await sql`ALTER TABLE debit_notes ADD COLUMN IF NOT EXISTS travel_allowance numeric DEFAULT 0`;
await sql`ALTER TABLE debit_notes ALTER COLUMN unit_price_goods TYPE numeric USING unit_price_goods::numeric`;
await sql`ALTER TABLE debit_notes ALTER COLUMN unit_price_qc TYPE numeric USING unit_price_qc::numeric`;
await sql`ALTER TABLE debit_notes ALTER COLUMN unit_price_ot TYPE numeric USING unit_price_ot::numeric`;
await sql`ALTER TABLE debit_note_items ALTER COLUMN unit_price TYPE numeric USING unit_price::numeric`;
await sql`ALTER TABLE debit_note_items ALTER COLUMN line_total TYPE numeric USING line_total::numeric`;
console.log('Migration done');
