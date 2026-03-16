export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ─── ENUMS ────────────────────────────────────────────────────────────────────
export type UserRole = 'staff' | 'leader' | 'manager' | 'accounting_admin';
export type OrderLotStatus = 'active' | 'completed' | 'cancelled';
export type SessionStatus = 'draft' | 'submitted' | 'approved' | 'locked' | 'rejected';
export type DebitNoteStatus = 'draft' | 'reviewed' | 'locked';
export type ImportJobStatus = 'uploaded' | 'parsing' | 'preview' | 'validating' | 'committed' | 'failed' | 'cancelled';
export type ValidationStatus = 'pending' | 'valid' | 'warning' | 'error';
export type RuleType = 'first_inspection' | 'reinspection';

// ─── TABLE ROWS ───────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  name_vn: string;
  name_jp: string;
  role: UserRole;
  factory_id: string | null;
  active: boolean;
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

export interface DefectCatalog {
  id: string;
  code: string;
  name: string;
  product_type_id: string | null;
  active: boolean;
  created_at: string;
}

export interface DefectCatalogItem {
  id: string;
  catalog_id: string;
  code: string;
  name_vn: string;
  name_jp: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface ReportTemplate {
  id: string;
  code: string;
  name: string;
  customer_id: string | null;
  factory_id: string | null;
  defect_catalog_id: string | null;
  export_format: string;
  active: boolean;
  created_at: string;
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

export interface OrderLot {
  id: string;
  lot_code: string;
  product_style_id: string;
  customer_id: string;
  factory_id: string;
  debit_group: string;
  contract_no: string;
  order_qty: number;
  unit_price: number;
  currency: string;
  delivery_date: string | null;
  status: OrderLotStatus;
  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface PriceRule {
  id: string;
  customer_id: string | null;
  factory_id: string | null;
  product_type_id: string | null;
  product_style_id: string | null;
  rule_type: RuleType;
  unit_price: number;
  currency: string;
  effective_from: string | null;
  effective_to: string | null;
  priority: number;
  active: boolean;
  notes: string;
  created_at: string;
  created_by: string | null;
}

export interface UserFactoryPermission {
  id: string;
  user_id: string;
  factory_id: string;
  access_level: 'read_only' | 'read_write';
  created_at: string;
  created_by: string | null;
}

export interface QuantityLog {
  id: string;
  order_lot_id: string;
  log_date: string;
  quantity: number;
  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface InspectionSession {
  id: string;
  report_no: string | null;
  product_style_id: string;
  order_lot_id: string | null;
  customer_id: string;
  factory_id: string;
  template_id: string | null;
  inspection_date: string;
  inspector_id: string | null;
  supervisor_id: string | null;
  status: SessionStatus;
  submitted_at: string | null;
  submitted_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  locked_at: string | null;
  locked_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  reject_reason: string;
  notes: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface InspectionLine {
  id: string;
  session_id: string;
  color: string;
  size_label: string;
  inspected_qty: number;
  first_pass_good_qty: number;
  defect_qty: number;
  reinspection_qty: number;
  reinspection_good_qty: number;
  shipment_qty: number;
  sort_order: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface InspectionDefectRecord {
  id: string;
  line_id: string;
  defect_item_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface DebitNote {
  id: string;
  debit_note_no: string | null;
  customer_id: string;
  factory_id: string;
  period_from: string;
  period_to: string;
  currency: string;
  total_amount: number;
  status: DebitNoteStatus;
  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  locked_at: string | null;
  locked_by: string | null;
}

export interface DebitNoteItem {
  id: string;
  debit_note_id: string;
  session_id: string;
  order_lot_id: string | null;
  product_style_id: string | null;
  description: string;
  first_inspection_qty: number;
  reinspection_qty: number;
  unit_price: number;
  line_amount: number;
  currency: string;
  created_at: string;
}

export interface ImportJob {
  id: string;
  original_filename: string;
  import_type: string;
  status: ImportJobStatus;
  total_rows: number | null;
  valid_rows: number | null;
  error_rows: number | null;
  committed_rows: number | null;
  error_summary: string | null;
  template_detected: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_snapshot: Json | null;
  new_snapshot: Json | null;
  ip_address: string | null;
  notes: string | null;
  created_at: string;
}

export interface ApprovalLog {
  id: string;
  entity_type: string;
  entity_id: string;
  from_status: string | null;
  to_status: string;
  performed_by: string | null;
  reason: string | null;
  created_at: string;
}

// ─── COMPUTED TYPES (service layer output) ────────────────────────────────────

export interface InspectionLineCalc extends InspectionLine {
  accepted_qty: number;
  defect_rate: number;
}

export interface SessionSummary {
  total_inspected: number;
  total_first_pass_good: number;
  total_defect: number;
  total_reinspection: number;
  total_reinspection_good: number;
  total_accepted: number;
  total_shipment: number;
  session_defect_rate: number;
}

export interface LotProgress {
  order_lot_id: string;
  order_qty: number;
  produced_qty: number;
  remaining_qty: number;
  progress_pct: number;
  is_over_produced: boolean;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
export const ROLE_LABELS: Record<UserRole, string> = {
  staff: 'Nhân viên',
  leader: 'Tổ trưởng',
  manager: 'Quản lý',
  accounting_admin: 'Kế toán',
};

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  draft: 'Nháp',
  submitted: 'Chờ duyệt',
  approved: 'Đã duyệt',
  locked: 'Đã khóa',
  rejected: 'Từ chối',
};

export const SESSION_STATUS_COLORS: Record<SessionStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  locked: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export const ORDER_STATUS_LABELS: Record<OrderLotStatus, string> = {
  active: 'Đang chạy',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

export const DEFECT_THRESHOLD = 0.15;
