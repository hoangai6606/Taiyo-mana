import { pgTable, unique, text, varchar, boolean, timestamp, foreignKey, integer, date, numeric, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const userRole = pgEnum("user_role", ['staff', 'leader', 'manager', 'accounting_admin', 'super_admin'])


export const factories = pgTable("factories", {
	id: text().primaryKey().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	nameJp: varchar("name_jp", { length: 255 }).default(').notNull(),
	country: varchar({ length: 10 }).default('VN').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: text("created_by"),
	workspaceId: text("workspace_id"),
}, (table) => [
	unique("factories_code_unique").on(table.code),
]);

export const dailyReports = pgTable("daily_reports", {
	id: text().primaryKey().notNull(),
	recordId: text("record_id").notNull(),
	specifications: integer(),
	accessories: integer(),
	appearance: integer(),
	fabric: integer(),
	dirty: integer(),
	seamDefect: integer("seam_defect"),
	other: integer(),
	metalCheck: integer("metal_check"),
}, (table) => [
	foreignKey({
			columns: [table.recordId],
			foreignColumns: [inspectionRecords.id],
			name: "daily_reports_record_id_inspection_records_id_fk"
		}).onDelete("cascade"),
]);

export const inspectionRecords = pgTable("inspection_records", {
	id: text().primaryKey().notNull(),
	customerId: text("customer_id"),
	factoryIds: text("factory_ids").default('[]').notNull(),
	inspectionDate: timestamp("inspection_date", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: text("created_by"),
	code: varchar({ length: 20 }).notNull(),
	customerName: varchar("customer_name", { length: 255 }),
	workspaceId: text("workspace_id"),
}, (table) => [
	unique("inspection_records_code_unique").on(table.code),
]);

export const inspectionItems = pgTable("inspection_items", {
	id: text().primaryKey().notNull(),
	recordId: text("record_id").notNull(),
	inspectionDate: timestamp("inspection_date", { withTimezone: true, mode: 'string' }),
	inspectionContent: varchar("inspection_content", { length: 500 }),
	productCode: varchar("product_code", { length: 100 }),
	brand: varchar({ length: 100 }),
	productName: varchar("product_name", { length: 255 }),
	color: varchar({ length: 100 }),
	size: varchar({ length: 50 }),
	inspectedQuantity: integer("inspected_quantity"),
	passedQuantity: integer("passed_quantity"),
	defectiveQuantity: integer("defective_quantity"),
	specifications: integer(),
	accessories: integer(),
	appearance: integer(),
	fabric: integer(),
	dirty: integer(),
	seamDefect: integer("seam_defect"),
	other: integer(),
	metalCheck: integer("metal_check"),
}, (table) => [
	foreignKey({
			columns: [table.recordId],
			foreignColumns: [inspectionRecords.id],
			name: "inspection_items_record_id_inspection_records_id_fk"
		}).onDelete("cascade"),
]);

export const productivityTracking = pgTable("productivity_tracking", {
	id: text().primaryKey().notNull(),
	recordId: text("record_id").notNull(),
	qcQuantity: integer("qc_quantity"),
	ot: integer(),
	recordDate: date("record_date").notNull(),
	factoryId: text("factory_id"),
}, (table) => [
	foreignKey({
			columns: [table.recordId],
			foreignColumns: [inspectionRecords.id],
			name: "productivity_tracking_record_id_inspection_records_id_fk"
		}).onDelete("cascade"),
]);

export const debitNotes = pgTable("debit_notes", {
	id: text().primaryKey().notNull(),
	debitNo: varchar("debit_no", { length: 50 }).notNull(),
	customerId: text("customer_id"),
	customerName: varchar("customer_name", { length: 255 }),
	inspectionRecordId: text("inspection_record_id"),
	unitPriceGoods: integer("unit_price_goods").default(0),
	unitPriceQc: integer("unit_price_qc").default(0),
	notes: text(),
	travelAllowance: numeric("travel_allowance").default(0),
	workspaceId: text("workspace_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: text("created_by"),
}, (table) => [
	unique("debit_notes_debit_no_unique").on(table.debitNo),
]);

export const debitNoteItems = pgTable("debit_note_items", {
	id: text().primaryKey().notNull(),
	debitNoteId: text("debit_note_id").notNull(),
	productCode: varchar("product_code", { length: 100 }),
	size: varchar({ length: 50 }),
	quantity: integer().default(0),
	unitPrice: integer("unit_price").default(0),
	lineTotal: integer("line_total").default(0),
	itemType: varchar("item_type", { length: 20 }).default('goods').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.debitNoteId],
			foreignColumns: [debitNotes.id],
			name: "debit_note_items_debit_note_id_debit_notes_id_fk"
		}).onDelete("cascade"),
]);

export const factoryPrices = pgTable("factory_prices", {
	id: text().primaryKey().notNull(),
	factoryId: text("factory_id").notNull(),
	unitPrice: numeric("unit_price", { precision: 12, scale:  4 }).default('0').notNull(),
	currency: varchar({ length: 10 }).default('USD').notNull(),
	effectiveDate: date("effective_date").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: text("created_by"),
}, (table) => [
	foreignKey({
			columns: [table.factoryId],
			foreignColumns: [factories.id],
			name: "factory_prices_factory_id_factories_id_fk"
		}),
]);

export const workspaces = pgTable("workspaces", {
	id: text().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	managerId: text("manager_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const userFactoryPermissions = pgTable("user_factory_permissions", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	factoryId: text("factory_id").notNull(),
	accessLevel: varchar("access_level", { length: 20 }).default('read_only').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: text("created_by"),
});

export const productStyles = pgTable("product_styles", {
	id: text().primaryKey().notNull(),
	styleCode: varchar("style_code", { length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	customerId: text("customer_id").notNull(),
	factoryId: text("factory_id").notNull(),
	productTypeId: text("product_type_id").notNull(),
	active: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: text("created_by"),
	workspaceId: text("workspace_id"),
});

export const customers = pgTable("customers", {
	id: text().primaryKey().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	nameJp: varchar("name_jp", { length: 255 }).default(').notNull(),
	currency: varchar({ length: 10 }).default('USD').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: text("created_by"),
	workspaceId: text("workspace_id"),
}, (table) => [
	unique("customers_code_unique").on(table.code),
]);

export const productTypes = pgTable("product_types", {
	id: text().primaryKey().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	nameJp: varchar("name_jp", { length: 255 }).default(').notNull(),
	workspaceId: text("workspace_id"),
}, (table) => [
	unique("product_types_code_unique").on(table.code),
]);

export const profiles = pgTable("profiles", {
	id: text().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	passwordHash: text("password_hash").notNull(),
	nameVn: varchar("name_vn", { length: 255 }).notNull(),
	nameJp: varchar("name_jp", { length: 255 }).default(').notNull(),
	role: userRole().default('staff').notNull(),
	factoryId: text("factory_id"),
	active: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	workspaceId: text("workspace_id"),
}, (table) => [
	unique("profiles_email_unique").on(table.email),
]);
