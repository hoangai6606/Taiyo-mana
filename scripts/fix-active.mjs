import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  const r1 = await client.query("UPDATE profiles SET active = true WHERE email = 'superadmin@taiyo.com' RETURNING email, active");
  console.log('UPDATE via pg:', JSON.stringify(r1.rows));
  const r2 = await client.query("SELECT email, active FROM profiles WHERE email = 'superadmin@taiyo.com'");
  console.log('SELECT after:', JSON.stringify(r2.rows));
} finally {
  await client.end();
}
