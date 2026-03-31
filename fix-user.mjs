import { db } from './server/db.js';
import { profiles } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

async function fixUser() {
  // Check current superadmin
  const user = await db.query.profiles.findFirst({
    where: (profiles, { eq }) => eq(profiles.email, 'superadmin@taiyo.com')
  });
  console.log('Current user:', JSON.stringify({email: user?.email, active: user?.active, role: user?.role}));

  // Delete and recreate
  if (user) {
    await db.delete(profiles).where(eq(profiles.email, 'superadmin@taiyo.com'));
    console.log('Deleted old user');
  }

  // Import bcrypt
  const { hash } = await import('bcryptjs');
  const passwordHash = await hash('password123', 10);

  // Use raw SQL for insert
  await db.execute(sql`
    INSERT INTO profiles (id, email, password_hash, name_vn, name_jp, role, active, workspace_id)
    VALUES (gen_random_uuid(), 'superadmin@taiyo.com', ${passwordHash}, 'Quản Trị Hệ Thống', 'システム管理者', 'super_admin', true, '00000000-0000-0000-0000-000000000000')
  `);
  console.log('Inserted new user');

  // Fix active flag explicitly
  await db.update(profiles).set({ active: true }).where(eq(profiles.email, 'superadmin@taiyo.com'));
  console.log('Set active=true');

  // Check again
  const user2 = await db.query.profiles.findFirst({
    where: (profiles, { eq }) => eq(profiles.email, 'superadmin@taiyo.com')
  });
  console.log('After fix:', JSON.stringify({email: user2?.email, active: user2?.active, role: user2?.role}));
}

fixUser();