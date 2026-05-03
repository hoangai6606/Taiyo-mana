import 'dotenv/config';
import { pgTable, pgEnum, varchar, text, boolean, timestamp, integer, date, numeric } from 'drizzle-orm/pg-core';

// ─── ENUMS ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['staff', 'leader', 'manager', 'accounting_admin', 'super_admin']);

// ─── TABLES ───────────────────────────────────────────────────────────────────

export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  managerId: text('manager_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  nameVn: varchar('name_vn', { length: 255 }).notNull(),
  nameJp: varchar('name_jp', { length: 255 }).notNull().default(''),
  role: userRoleEnum('role').notNull().default('staff'),
  factoryId: text('factory_id'),
  active: boolean('active').notNull().default(true),
  workspaceId: text('workspace_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  nameJp: varchar('name_jp', { length: 255 }).notNull().default(''),
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  isActive: boolean('is_active').notNull().default(true),
  workspaceId: text('workspace_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: text('created_by'),
});

export const factories = pgTable('factories', {
  id: text('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  nameJp: varchar('name_jp', { length: 255 }).notNull().default(''),
  country: varchar('country', { length: 10 }).notNull().default('VN'),
  isActive: boolean('is_active').notNull().default(true),
  workspaceId: text('workspace_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: text('created_by'),
});

export const productTypes = pgTable('product_types', {
  id: text('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  nameJp: varchar('name_jp', { length: 255 }).notNull().default(''),
  workspaceId: text('workspace_id'),
});

export const productStyles = pgTable('product_styles', {
  id: text('id').primaryKey(),
  styleCode: varchar('style_code', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  customerId: text('customer_id').notNull(),
  factoryId: text('factory_id').notNull(),
  productTypeId: text('product_type_id').notNull(),
  active: boolean('active').notNull().default(true),
  workspaceId: text('workspace_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: text('created_by'),
});

export const userFactoryPermissions = pgTable('user_factory_permissions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  factoryId: text('factory_id').notNull(),
  accessLevel: varchar('access_level', { length: 20 }).notNull().default('read_only'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: text('created_by'),
});

// ─── INSPECTION TABLES ────────────────────────────────────────────────────────

export const inspectionRecords = pgTable('inspection_records', {
  id: text('id').primaryKey(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  customerId: text('customer_id'),
  customerName: varchar('customer_name', { length: 255 }),
  factoryIds: text('factory_ids').notNull().default('[]'), // JSON array of UUIDs
  inspectionDate: timestamp('inspection_date', { withTimezone: true }).notNull(),
  workspaceId: text('workspace_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: text('created_by'),
});

export const inspectionItems = pgTable('inspection_items', {
  id: text('id').primaryKey(),
  recordId: text('record_id').notNull().references(() => inspectionRecords.id, { onDelete: 'cascade' }),
  inspectionDate: timestamp('inspection_date', { withTimezone: true }),
  inspectionContent: varchar('inspection_content', { length: 500 }),
  productCode: varchar('product_code', { length: 100 }),
  brand: varchar('brand', { length: 100 }),
  productName: varchar('product_name', { length: 255 }),
  color: varchar('color', { length: 100 }),
  size: varchar('size', { length: 50 }),
  inspectedQuantity: integer('inspected_quantity'),
  passedQuantity: integer('passed_quantity'),
  defectiveQuantity: integer('defective_quantity'),
  specifications: integer('specifications'),
  accessories: integer('accessories'),
  appearance: integer('appearance'),
  fabric: integer('fabric'),
  dirty: integer('dirty'),
  seamDefect: integer('seam_defect'),
  other: integer('other'),
  printDefect: integer('print_defect'),
  soleDefect: integer('sole_defect'),
  scratchDefect: integer('scratch_defect'),
  metalCheck: integer('metal_check'),
  reinspectQuantity: integer('reinspect_quantity'),
  reinspectPassed: integer('reinspect_passed'),
  reinspectFailed: integer('reinspect_failed'),
  reinspectSpecifications: text('reinspect_specifications'),
  reinspectAccessories: text('reinspect_accessories'),
  reinspectAppearance: text('reinspect_appearance'),
  reinspectPrintDefect: integer('reinspect_print_defect').default(0),
  reinspectSoleDefect: integer('reinspect_sole_defect').default(0),
  reinspectScratchDefect: integer('reinspect_scratch_defect').default(0),
});

export const inspectionReports = pgTable('inspection_reports', {
  id: text('id').primaryKey(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  sourceRecordId: text('source_record_id'),
  customerName: varchar('customer_name', { length: 255 }),
  factoryNames: text('factory_names'),
  inspectionDate: timestamp('inspection_date', { withTimezone: true }),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  workspaceId: text('workspace_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: text('created_by'),
});

export const reportItems = pgTable('report_items', {
  id: text('id').primaryKey(),
  reportId: text('report_id').notNull().references(() => inspectionReports.id, { onDelete: 'cascade' }),
  inspectionDate: timestamp('inspection_date', { withTimezone: true }),
  inspectionContent: varchar('inspection_content', { length: 500 }),
  productCode: varchar('product_code', { length: 100 }),
  brand: varchar('brand', { length: 100 }),
  productName: varchar('product_name', { length: 255 }),
  color: varchar('color', { length: 100 }),
  size: varchar('size', { length: 50 }),
  inspectedQuantity: integer('inspected_quantity'),
  passedQuantity: integer('passed_quantity'),
  defectiveQuantity: integer('defective_quantity'),
  specifications: integer('specifications'),
  accessories: integer('accessories'),
  appearance: integer('appearance'),
  fabric: integer('fabric'),
  dirty: integer('dirty'),
  seamDefect: integer('seam_defect'),
  other: integer('other'),
  printDefect: integer('print_defect'),
  soleDefect: integer('sole_defect'),
  scratchDefect: integer('scratch_defect'),
  metalCheck: integer('metal_check'),
  reinspectQuantity: integer('reinspect_quantity'),
  reinspectPassed: integer('reinspect_passed'),
  reinspectFailed: integer('reinspect_failed'),
  reinspectSpecifications: text('reinspect_specifications'),
  reinspectAccessories: text('reinspect_accessories'),
  reinspectAppearance: text('reinspect_appearance'),
  reinspectPrintDefect: integer('reinspect_print_defect').default(0),
  reinspectSoleDefect: integer('reinspect_sole_defect').default(0),
  reinspectScratchDefect: integer('reinspect_scratch_defect').default(0),
});

export const reportProductivity = pgTable('report_productivity', {
  id: text('id').primaryKey(),
  reportId: text('report_id').notNull().references(() => inspectionReports.id, { onDelete: 'cascade' }),
  recordDate: date('record_date').notNull(),
  factoryId: text('factory_id'),
  factoryName: varchar('factory_name', { length: 255 }),
  qcQuantity: integer('qc_quantity'),
  transitQuantity: integer('transit_quantity'),
  ot: integer('ot'),
});

export const dailyReports = pgTable('daily_reports', {
  id: text('id').primaryKey(),
  recordId: text('record_id').notNull().references(() => inspectionRecords.id, { onDelete: 'cascade' }),
  specifications: integer('specifications'),
  accessories: integer('accessories'),
  appearance: integer('appearance'),
  fabric: integer('fabric'),
  dirty: integer('dirty'),
  seamDefect: integer('seam_defect'),
  other: integer('other'),
  metalCheck: integer('metal_check'),
});

export const productivityTracking = pgTable('productivity_tracking', {
  id: text('id').primaryKey(),
  recordId: text('record_id').notNull().references(() => inspectionRecords.id, { onDelete: 'cascade' }),
  recordDate: date('record_date').notNull(),
  factoryId: text('factory_id'),
  qcQuantity: integer('qc_quantity'),
  transitQuantity: integer('transit_quantity'),
  ot: integer('ot'),
});

// ─── DEBIT NOTE TABLES ────────────────────────────────────────────────────────

export const debitNotes = pgTable('debit_notes', {
  id: text('id').primaryKey(),
  debitNo: varchar('debit_no', { length: 50 }).notNull().unique(),
  customerId: text('customer_id'),
  customerName: varchar('customer_name', { length: 255 }),
  inspectionRecordId: text('inspection_record_id'),
  inspectionReportId: text('inspection_report_id'),
  unitPriceGoods: numeric('unit_price_goods').default('0'),
  unitPriceQc: numeric('unit_price_qc').default('0'),
  unitPriceOt: numeric('unit_price_ot').default('0'),
  notes: text('notes'),
  travelAllowance: numeric('travel_allowance').default(0),
  travelDays: numeric('travel_days').default('0'),
  travelUnitPrice: numeric('travel_unit_price').default('0'),
  vehicleCount: numeric('vehicle_count').default('0'),
  travelHoursQty: numeric('travel_hours_qty').default('0'),
  travelHoursTime: numeric('travel_hours_time').default('0'),
  travelHoursUnitPrice: numeric('travel_hours_unit_price').default('0'),
  workspaceId: text('workspace_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: text('created_by'),
});

export const debitNoteItems = pgTable('debit_note_items', {
  id: text('id').primaryKey(),
  debitNoteId: text('debit_note_id').notNull().references(() => debitNotes.id, { onDelete: 'cascade' }),
  productCode: varchar('product_code', { length: 100 }),
  size: varchar('size', { length: 50 }),
  quantity: integer('quantity').default(0),
  unitPrice: numeric('unit_price').default('0'),
  lineTotal: numeric('line_total').default('0'),
  itemType: varchar('item_type', { length: 20 }).notNull().default('goods'), // 'goods' or 'qc'
  hours: numeric('hours').default(null),
  inspectionContent: varchar('inspection_content', { length: 100 }),
});

// ─── FACTORY PRICES TABLE ─────────────────────────────────────────────────────

export const factoryPrices = pgTable('factory_prices', {
  id: text('id').primaryKey(),
  factoryId: text('factory_id').notNull().references(() => factories.id),
  unitPrice: numeric('unit_price', { precision: 12, scale: 4 }).notNull().default('0'),
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  effectiveDate: date('effective_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: text('created_by'),
});

// ─── CHAT MESSAGES TABLE ─────────────────────────────────────────────────────

export const chatMessages = pgTable('chat_messages', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id'), // NULL = global superadmin channel
  senderId: text('sender_id').notNull(),
  senderName: varchar('sender_name', { length: 255 }).notNull(),
  senderRole: varchar('sender_role', { length: 50 }).notNull(),
  message: text('message').notNull(),
  fileUrl: text('file_url'),
  fileName: text('file_name'),
  fileType: varchar('file_type', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
