import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import * as mockData from '../src/lib/mock-data.js';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const DEFAULT_PASSWORD = 'password123';

// Mapping from mock string IDs to real UUIDs
const idMap: Record<string, string> = {};

function mapId(mockId: string, realId: string) {
  idMap[mockId] = realId;
}

function getId(mockId: string | null | undefined): string | null {
  if (!mockId) return null;
  return idMap[mockId] ?? mockId;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }

  const db = neon(process.env.DATABASE_URL);

  // Skip if already seeded
  const [{ count }] = await db`SELECT COUNT(*)::int as count FROM product_types`;
  if (count > 0) {
    console.log('Database already seeded — skipping.');
    return;
  }

  // Step 1: Insert product types
  console.log('Seeding product types...');
  for (const pt of mockData.MOCK_PRODUCT_TYPES) {
    const newId = randomUUID();
    await db`INSERT INTO product_types (id, code, name, name_jp) VALUES (${newId}, ${pt.code}, ${pt.name}, ${pt.name_jp})`;
    mapId(pt.id, newId);
  }
  console.log(`  Inserted ${mockData.MOCK_PRODUCT_TYPES.length} product types`);

  // Step 2: Insert factories
  console.log('Seeding factories...');
  for (const f of mockData.MOCK_FACTORIES) {
    const newId = randomUUID();
    await db`INSERT INTO factories (id, code, name, name_jp, country, is_active) VALUES (${newId}, ${f.code}, ${f.name}, ${f.name_jp}, ${f.country}, ${f.is_active})`;
    mapId(f.id, newId);
  }
  console.log(`  Inserted ${mockData.MOCK_FACTORIES.length} factories`);

  // Step 3: Insert profiles - handle null factory_id separately
  console.log('Seeding profiles...');
  const usersWithFactory = [
    { id: 'user-001', email: 'manager@taiyo.com', name_vn: 'Nguyễn Quản Lý', name_jp: '管理者', role: 'manager', factory_id: 'factory-001', active: true },
    { id: 'user-002', email: 'leader@taiyo.com', name_vn: 'Trần Tổ Trưởng', name_jp: 'リーダー', role: 'leader', factory_id: 'factory-001', active: true },
  ];
  const usersWithoutFactory = [
    { id: 'user-003', email: 'staff@taiyo.com', name_vn: 'Lê Nhân Viên', name_jp: 'スタッフ', role: 'staff', active: true },
    { id: 'user-004', email: 'superadmin@taiyo.com', name_vn: 'Quản Trị Hệ Thống', name_jp: 'システム管理者', role: 'super_admin', active: true },
  ];

  for (const u of usersWithFactory) {
    const newId = randomUUID();
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    await db`INSERT INTO profiles (id, email, password_hash, name_vn, name_jp, role, factory_id, active) VALUES (${newId}, ${u.email}, ${passwordHash}, ${u.name_vn}, ${u.name_jp}, ${u.role}, ${getId(u.factory_id)}, ${u.active})`;
    mapId(u.id, newId);
  }
  for (const u of usersWithoutFactory) {
    const newId = randomUUID();
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    await db`INSERT INTO profiles (id, email, password_hash, name_vn, name_jp, role, active) VALUES (${newId}, ${u.email}, ${passwordHash}, ${u.name_vn}, ${u.name_jp}, ${u.role}, ${u.active})`;
    mapId(u.id, newId);
  }
  console.log(`  Inserted ${usersWithFactory.length + usersWithoutFactory.length} profiles`);

  // Step 4: Insert customers
  console.log('Seeding customers...');
  for (const c of mockData.MOCK_CUSTOMERS) {
    const newId = randomUUID();
    await db`INSERT INTO customers (id, code, name, name_jp, currency, is_active) VALUES (${newId}, ${c.code}, ${c.name}, ${c.name_jp}, ${c.currency}, ${c.is_active})`;
    mapId(c.id, newId);
  }
  console.log(`  Inserted ${mockData.MOCK_CUSTOMERS.length} customers`);

  // Step 5: Insert product styles
  console.log('Seeding product styles...');
  for (const s of mockData.MOCK_PRODUCT_STYLES) {
    const newId = randomUUID();
    await db`INSERT INTO product_styles (id, style_code, name, customer_id, factory_id, product_type_id, active) VALUES (${newId}, ${s.style_code}, ${s.name}, ${getId(s.customer_id)}, ${getId(s.factory_id)}, ${getId(s.product_type_id)}, ${s.active})`;
    mapId(s.id, newId);
  }
  console.log(`  Inserted ${mockData.MOCK_PRODUCT_STYLES.length} product styles`);

  // Step 6: Insert user factory permissions
  console.log('Seeding user factory permissions...');
  for (const p of mockData.MOCK_USER_PERMISSIONS) {
    const newId = randomUUID();
    await db`INSERT INTO user_factory_permissions (id, user_id, factory_id, access_level, created_by) VALUES (${newId}, ${getId(p.user_id)}, ${getId(p.factory_id)}, ${p.access_level}, ${getId(p.created_by)})`;
    mapId(p.id, newId);
  }
  console.log(`  Inserted ${mockData.MOCK_USER_PERMISSIONS.length} user permissions`);

  console.log('\n✅ Seed completed successfully!');
  console.log('\nDefault login credentials:');
  console.log('  Email: manager@taiyo.com');
  console.log(`  Password: ${DEFAULT_PASSWORD}`);
}

main();
