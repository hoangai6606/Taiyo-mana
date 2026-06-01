export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ─── ENUMS ────────────────────────────────────────────────────────────────────
export type UserRole = 'staff' | 'leader' | 'manager' | 'accounting_admin' | 'super_admin';

// ─── TABLE ROWS ───────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  name_vn: string;
  name_jp: string;
  role: UserRole;
  factory_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  workspace_id?: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  managerId: string | null;
  managerEmail?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  name_jp: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Factory {
  id: string;
  code: string;
  name: string;
  name_jp: string;
  country: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ProductTypeRecord {
  id: string;
  code: string;
  name: string;
  name_jp: string;
}

export interface ProductStyle {
  id: string;
  style_code: string;
  name: string;
  customer_id: string;
  factory_id: string;
  product_type_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// ─── INSPECTION TYPES ─────────────────────────────────────────────────────────

export interface InspectionRecord {
  id: string;
  code: string;
  customerId: string;
  customerName?: string;
  factoryIds: string;
  factoryNames?: string;
  inspectionDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  items?: InspectionItem[];
  reports?: DailyReport[];
  productivity?: ProductivityTracking[];
}

export interface InspectionItem {
  id: string;
  recordId: string;
  inspectionDate: string | null;
  inspectionContent: string;
  productCode: string;
  brand: string;
  productName: string;
  color: string;
  size: string;
  inspectedQuantity: number;
  passedQuantity: number;
  defectiveQuantity: number;
  specifications: number;
  accessories: number;
  appearance: number;
  fabric: number;
  dirty: number;
  seamDefect: number;
  other: number;
  printDefect: number;
  soleDefect: number;
  scratchDefect: number;
  metalCheck: number;
  reinspectQuantity: number;
  reinspectPassed: number;
  reinspectFailed: number;
  reinspectSpecifications: string;
  reinspectAccessories: string;
  reinspectAppearance: string;
  reinspectPrintDefect: number;
  reinspectSoleDefect: number;
  reinspectScratchDefect: number;
}

export interface DailyReport {
  id: string;
  recordId: string;
  specifications: number;
  accessories: number;
  appearance: number;
  fabric: number;
  dirty: number;
  seamDefect: number;
  other: number;
  metalCheck: number;
}

export interface ProductivityTracking {
  id: string;
  recordId: string;
  recordDate: string;
  factoryId: string | null;
  qcQuantity: number;
  transitQuantity: number;
  ot: number;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
export const ROLE_LABELS: Record<UserRole, string> = {
  staff: 'Nhân viên',
  leader: 'Tổ trưởng',
  manager: 'Quản lý',
  accounting_admin: 'Kế toán',
  super_admin: 'Super Admin',
};

// ─── INSPECTION REPORT TYPES ────────────────────────────────────────────────────

export interface InspectionReport {
  id: string;
  code: string;
  sourceRecordId: string | null;
  customerName: string | null;
  factoryNames: string | null;
  inspectionDate: string | null;
  status: 'draft' | 'finalized';
  workspaceId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  items?: ReportItem[];
  productivity?: ReportProductivity[];
}

export interface ReportProductivity {
  id: string;
  reportId: string;
  recordDate: string;
  factoryId: string | null;
  factoryName: string;
  qcQuantity: number;
  transitQuantity: number;
  ot: number;
}

export interface ReportItem {
  id: string;
  reportId: string;
  inspectionDate: string | null;
  inspectionContent: string;
  productCode: string;
  brand: string;
  productName: string;
  color: string;
  size: string;
  inspectedQuantity: number;
  passedQuantity: number;
  defectiveQuantity: number;
  specifications: number;
  accessories: number;
  appearance: number;
  fabric: number;
  dirty: number;
  seamDefect: number;
  other: number;
  printDefect: number;
  soleDefect: number;
  scratchDefect: number;
  metalCheck: number;
  reinspectQuantity: number;
  reinspectPassed: number;
  reinspectFailed: number;
  reinspectSpecifications: string;
  reinspectAccessories: string;
  reinspectAppearance: string;
  reinspectPrintDefect: number;
  reinspectSoleDefect: number;
  reinspectScratchDefect: number;
}

// ─── DEBIT NOTE TYPES ─────────────────────────────────────────────────────────

export interface CustomTable {
  name: string;
  columnNames: string[];
  rows: number[][];
}

export interface TravelDayDetail {
  date: string;
  peopleCount: number;
  unitPrice: number;
  vehicleCount: number;
}

export interface DebitNote {
  id: string;
  debitNo: string;
  customerId: string | null;
  customerName: string | null;
  inspectionRecordId: string | null;
  inspectionReportId: string | null;
  unitPriceGoods: number;
  unitPriceQc: number;
  unitPriceOt: number;
  notes: string | null;
  travelAllowance?: number;
  travelDays?: number;
  travelUnitPrice?: number;
  vehicleCount?: number;
  travelHoursQty?: number;
  travelHoursTime?: number;
  travelHoursUnitPrice?: number;
  travelDetails?: string | null;
  customData?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  items?: DebitNoteItem[];
}

export interface DebitNoteItem {
  id: string;
  debitNoteId: string;
  productCode: string | null;
  size: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  itemType: 'goods' | 'qc' | 'ot';
  hours: number | null;
  inspectionContent: string | null;
}

// ─── FACTORY PRICE TYPES ─────────────────────────────────────────────────────

export interface FactoryPrice {
  id: string;
  factoryId: string;
  unitPrice: number;
  currency: string;
  effectiveDate: string;
  createdAt: string;
  createdBy: string | null;
  factoryCode?: string;
  factoryName?: string;
}
