import type {
  Profile, Customer, Factory, ProductTypeRecord, ProductStyle,
  OrderLot, QuantityLog, InspectionSession, InspectionLine,
  DebitNote, DebitNoteItem, ImportJob, AuditLog, ApprovalLog,
  DefectCatalog, DefectCatalogItem, ReportTemplate, PriceRule, UserFactoryPermission,
} from './database.types';

export const MOCK_PROFILE: Profile = {
  id: 'user-001',
  name_vn: 'Nguyễn Quản Lý',
  name_jp: '管理者',
  role: 'manager',
  factory_id: 'factory-001',
  active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'cust-001', code: 'GARDNER', name: 'Gardner Inc.', name_jp: 'ガードナー', currency: 'USD', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', created_by: null },
  { id: 'cust-002', code: 'TANAKA', name: 'Tanaka Corp.', name_jp: '田中株式会社', currency: 'JPY', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', created_by: null },
  { id: 'cust-003', code: 'MIURA', name: 'Miura Trading', name_jp: '三浦商事', currency: 'JPY', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', created_by: null },
];

export const MOCK_FACTORIES: Factory[] = [
  { id: 'factory-001', code: 'TPA', name: 'TAN PHUOC AN', name_jp: 'タン・フオック・アン', country: 'VN', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', created_by: null },
  { id: 'factory-002', code: 'TAN', name: 'TAN AN FACTORY', name_jp: 'タン・アン', country: 'VN', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', created_by: null },
];

export const MOCK_PRODUCT_TYPES: ProductTypeRecord[] = [
  { id: 'type-001', code: 'SHOE', name: 'Giày', name_jp: '靴' },
  { id: 'type-002', code: 'BAG', name: 'Túi xách', name_jp: 'バッグ' },
  { id: 'type-003', code: 'BELT', name: 'Dây thắt lưng', name_jp: 'ベルト' },
];

export const MOCK_PRODUCT_STYLES: ProductStyle[] = [
  { id: 'style-001', style_code: 'BR-1120', name: 'Boot Round 1120', customer_id: 'cust-001', factory_id: 'factory-001', product_type_id: 'type-001', active: true, created_at: '2024-01-15T00:00:00Z', updated_at: '2024-01-15T00:00:00Z', created_by: 'user-001' },
  { id: 'style-002', style_code: 'LF-2240', name: 'Loafer 2240', customer_id: 'cust-002', factory_id: 'factory-001', product_type_id: 'type-001', active: true, created_at: '2024-01-20T00:00:00Z', updated_at: '2024-01-20T00:00:00Z', created_by: 'user-001' },
  { id: 'style-003', style_code: 'SN-3310', name: 'Sneaker 3310', customer_id: 'cust-001', factory_id: 'factory-002', product_type_id: 'type-001', active: true, created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z', created_by: 'user-001' },
  { id: 'style-004', style_code: 'TB-4400', name: 'Tote Bag 4400', customer_id: 'cust-003', factory_id: 'factory-002', product_type_id: 'type-002', active: true, created_at: '2024-02-10T00:00:00Z', updated_at: '2024-02-10T00:00:00Z', created_by: 'user-001' },
  { id: 'style-005', style_code: 'BL-5500', name: 'Belt Leather 5500', customer_id: 'cust-002', factory_id: 'factory-001', product_type_id: 'type-003', active: false, created_at: '2024-01-05T00:00:00Z', updated_at: '2024-02-15T00:00:00Z', created_by: 'user-001' },
];

export const MOCK_ORDER_LOTS: OrderLot[] = [
  { id: 'lot-001', lot_code: 'TPA-2024-001', product_style_id: 'style-001', customer_id: 'cust-001', factory_id: 'factory-001', debit_group: 'DG-2024-Q1', contract_no: 'CT-24001', order_qty: 5000, unit_price: 12.5, currency: 'USD', delivery_date: '2024-06-30', status: 'active', notes: '', created_at: '2024-01-15T00:00:00Z', updated_at: '2024-01-15T00:00:00Z', created_by: 'user-001', updated_by: null },
  { id: 'lot-002', lot_code: 'TPA-2024-002', product_style_id: 'style-002', customer_id: 'cust-002', factory_id: 'factory-001', debit_group: 'DG-2024-Q1', contract_no: 'CT-24002', order_qty: 3000, unit_price: 15.0, currency: 'JPY', delivery_date: '2024-07-15', status: 'active', notes: '', created_at: '2024-01-20T00:00:00Z', updated_at: '2024-01-20T00:00:00Z', created_by: 'user-001', updated_by: null },
  { id: 'lot-003', lot_code: 'TAN-2024-001', product_style_id: 'style-003', customer_id: 'cust-001', factory_id: 'factory-002', debit_group: 'DG-2024-Q2', contract_no: 'CT-24003', order_qty: 8000, unit_price: 9.8, currency: 'USD', delivery_date: '2024-08-31', status: 'active', notes: 'Ưu tiên giao hàng sớm', created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z', created_by: 'user-001', updated_by: null },
  { id: 'lot-004', lot_code: 'TAN-2024-002', product_style_id: 'style-004', customer_id: 'cust-003', factory_id: 'factory-002', debit_group: 'DG-2024-Q2', contract_no: 'CT-24004', order_qty: 2000, unit_price: 22.0, currency: 'JPY', delivery_date: '2024-07-01', status: 'completed', notes: '', created_at: '2024-02-10T00:00:00Z', updated_at: '2024-03-10T00:00:00Z', created_by: 'user-001', updated_by: 'user-001' },
  { id: 'lot-005', lot_code: 'TPA-2024-003', product_style_id: 'style-001', customer_id: 'cust-001', factory_id: 'factory-001', debit_group: 'DG-2024-Q3', contract_no: 'CT-24005', order_qty: 4500, unit_price: 13.0, currency: 'USD', delivery_date: '2024-09-30', status: 'active', notes: '', created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T00:00:00Z', created_by: 'user-001', updated_by: null },
];

export const MOCK_QUANTITY_LOGS: QuantityLog[] = [
  { id: 'qlog-001', order_lot_id: 'lot-001', log_date: '2024-03-01', quantity: 500, notes: 'Ca sáng', created_at: '2024-03-01T08:00:00Z', updated_at: '2024-03-01T08:00:00Z', created_by: 'user-001', updated_by: null },
  { id: 'qlog-002', order_lot_id: 'lot-001', log_date: '2024-03-02', quantity: 480, notes: '', created_at: '2024-03-02T08:00:00Z', updated_at: '2024-03-02T08:00:00Z', created_by: 'user-001', updated_by: null },
  { id: 'qlog-003', order_lot_id: 'lot-001', log_date: '2024-03-04', quantity: 510, notes: 'OT 2 giờ', created_at: '2024-03-04T08:00:00Z', updated_at: '2024-03-04T08:00:00Z', created_by: 'user-001', updated_by: null },
  { id: 'qlog-004', order_lot_id: 'lot-001', log_date: '2024-03-05', quantity: 490, notes: '', created_at: '2024-03-05T08:00:00Z', updated_at: '2024-03-05T08:00:00Z', created_by: 'user-001', updated_by: null },
  { id: 'qlog-005', order_lot_id: 'lot-002', log_date: '2024-03-01', quantity: 300, notes: '', created_at: '2024-03-01T08:00:00Z', updated_at: '2024-03-01T08:00:00Z', created_by: 'user-001', updated_by: null },
  { id: 'qlog-006', order_lot_id: 'lot-002', log_date: '2024-03-02', quantity: 280, notes: 'Thiếu nguyên liệu', created_at: '2024-03-02T08:00:00Z', updated_at: '2024-03-02T08:00:00Z', created_by: 'user-001', updated_by: null },
  { id: 'qlog-007', order_lot_id: 'lot-003', log_date: '2024-03-01', quantity: 800, notes: '', created_at: '2024-03-01T08:00:00Z', updated_at: '2024-03-01T08:00:00Z', created_by: 'user-001', updated_by: null },
  { id: 'qlog-008', order_lot_id: 'lot-003', log_date: '2024-03-02', quantity: 750, notes: '', created_at: '2024-03-02T08:00:00Z', updated_at: '2024-03-02T08:00:00Z', created_by: 'user-001', updated_by: null },
  { id: 'qlog-009', order_lot_id: 'lot-003', log_date: '2024-03-04', quantity: 820, notes: '', created_at: '2024-03-04T08:00:00Z', updated_at: '2024-03-04T08:00:00Z', created_by: 'user-001', updated_by: null },
  { id: 'qlog-010', order_lot_id: 'lot-004', log_date: '2024-03-01', quantity: 2000, notes: 'Hoàn thành', created_at: '2024-03-01T08:00:00Z', updated_at: '2024-03-01T08:00:00Z', created_by: 'user-001', updated_by: null },
  { id: 'qlog-011', order_lot_id: 'lot-005', log_date: '2024-03-05', quantity: 1200, notes: '', created_at: '2024-03-05T08:00:00Z', updated_at: '2024-03-05T08:00:00Z', created_by: 'user-001', updated_by: null },
  { id: 'qlog-012', order_lot_id: 'lot-005', log_date: '2024-03-06', quantity: 5000, notes: 'Vượt order!', created_at: '2024-03-06T08:00:00Z', updated_at: '2024-03-06T08:00:00Z', created_by: 'user-001', updated_by: null },
];

export const MOCK_INSPECTION_LINES_MAP: Record<string, InspectionLine[]> = {
  'session-001': [
    { id: 'line-001', session_id: 'session-001', color: 'Đen', size_label: '38-42', inspected_qty: 500, first_pass_good_qty: 450, defect_qty: 50, reinspection_qty: 50, reinspection_good_qty: 30, shipment_qty: 480, sort_order: 10, notes: '', created_at: '2024-02-10T00:00:00Z', updated_at: '2024-02-10T00:00:00Z' },
    { id: 'line-002', session_id: 'session-001', color: 'Nâu', size_label: '38-42', inspected_qty: 300, first_pass_good_qty: 285, defect_qty: 15, reinspection_qty: 15, reinspection_good_qty: 12, shipment_qty: 297, sort_order: 20, notes: '', created_at: '2024-02-10T00:00:00Z', updated_at: '2024-02-10T00:00:00Z' },
  ],
  'session-002': [
    { id: 'line-003', session_id: 'session-002', color: 'Trắng', size_label: 'M', inspected_qty: 200, first_pass_good_qty: 120, defect_qty: 80, reinspection_qty: 80, reinspection_good_qty: 40, shipment_qty: 160, sort_order: 10, notes: 'Lỗi đường may nhiều', created_at: '2024-02-20T00:00:00Z', updated_at: '2024-02-20T00:00:00Z' },
    { id: 'line-004', session_id: 'session-002', color: 'Xanh', size_label: 'L', inspected_qty: 200, first_pass_good_qty: 140, defect_qty: 60, reinspection_qty: 60, reinspection_good_qty: 35, shipment_qty: 175, sort_order: 20, notes: '', created_at: '2024-02-20T00:00:00Z', updated_at: '2024-02-20T00:00:00Z' },
  ],
  'session-003': [],
  'session-004': [
    { id: 'line-005', session_id: 'session-004', color: 'Đỏ', size_label: 'One Size', inspected_qty: 1000, first_pass_good_qty: 960, defect_qty: 40, reinspection_qty: 40, reinspection_good_qty: 38, shipment_qty: 998, sort_order: 10, notes: '', created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T00:00:00Z' },
  ],
  'session-005': [],
};

export const MOCK_INSPECTION_SESSIONS: InspectionSession[] = [
  { id: 'session-001', report_no: 'INS-2024-001', product_style_id: 'style-001', order_lot_id: 'lot-001', customer_id: 'cust-001', factory_id: 'factory-001', template_id: null, inspection_date: '2024-02-10', inspector_id: 'user-001', supervisor_id: null, status: 'locked', submitted_at: '2024-02-11T00:00:00Z', submitted_by: 'user-001', approved_at: '2024-02-12T00:00:00Z', approved_by: 'user-001', locked_at: '2024-02-13T00:00:00Z', locked_by: 'user-001', rejected_at: null, rejected_by: null, reject_reason: '', notes: 'Kiểm tra lần 1', deleted_at: null, created_at: '2024-02-10T00:00:00Z', updated_at: '2024-02-13T00:00:00Z', created_by: 'user-001', updated_by: 'user-001' },
  { id: 'session-002', report_no: 'INS-2024-002', product_style_id: 'style-002', order_lot_id: 'lot-002', customer_id: 'cust-002', factory_id: 'factory-001', template_id: null, inspection_date: '2024-02-20', inspector_id: 'user-001', supervisor_id: null, status: 'submitted', submitted_at: '2024-02-21T00:00:00Z', submitted_by: 'user-001', approved_at: null, approved_by: null, locked_at: null, locked_by: null, rejected_at: null, rejected_by: null, reject_reason: '', notes: '', deleted_at: null, created_at: '2024-02-20T00:00:00Z', updated_at: '2024-02-21T00:00:00Z', created_by: 'user-001', updated_by: 'user-001' },
  { id: 'session-003', report_no: null, product_style_id: 'style-003', order_lot_id: 'lot-003', customer_id: 'cust-001', factory_id: 'factory-002', template_id: null, inspection_date: '2024-03-01', inspector_id: 'user-001', supervisor_id: null, status: 'draft', submitted_at: null, submitted_by: null, approved_at: null, approved_by: null, locked_at: null, locked_by: null, rejected_at: null, rejected_by: null, reject_reason: '', notes: '', deleted_at: null, created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T00:00:00Z', created_by: 'user-001', updated_by: null },
  { id: 'session-004', report_no: 'INS-2024-003', product_style_id: 'style-004', order_lot_id: 'lot-004', customer_id: 'cust-003', factory_id: 'factory-002', template_id: null, inspection_date: '2024-03-05', inspector_id: 'user-001', supervisor_id: null, status: 'approved', submitted_at: '2024-03-06T00:00:00Z', submitted_by: 'user-001', approved_at: '2024-03-07T00:00:00Z', approved_by: 'user-001', locked_at: null, locked_by: null, rejected_at: null, rejected_by: null, reject_reason: '', notes: '', deleted_at: null, created_at: '2024-03-05T00:00:00Z', updated_at: '2024-03-07T00:00:00Z', created_by: 'user-001', updated_by: 'user-001' },
  { id: 'session-005', report_no: 'INS-2024-004', product_style_id: 'style-001', order_lot_id: 'lot-001', customer_id: 'cust-001', factory_id: 'factory-001', template_id: null, inspection_date: '2024-03-10', inspector_id: 'user-001', supervisor_id: null, status: 'rejected', submitted_at: '2024-03-11T00:00:00Z', submitted_by: 'user-001', approved_at: null, approved_by: null, locked_at: null, locked_by: null, rejected_at: '2024-03-12T00:00:00Z', rejected_by: 'user-001', reject_reason: 'Thiếu dữ liệu tái kiểm', notes: '', deleted_at: null, created_at: '2024-03-10T00:00:00Z', updated_at: '2024-03-12T00:00:00Z', created_by: 'user-001', updated_by: 'user-001' },
];

export const MOCK_DEBIT_NOTES: DebitNote[] = [
  { id: 'debit-001', debit_note_no: 'DN-2024-001', customer_id: 'cust-001', factory_id: 'factory-001', period_from: '2024-01-01', period_to: '2024-03-31', currency: 'USD', total_amount: 6250.0, status: 'locked', notes: 'Q1 2024', created_at: '2024-04-01T00:00:00Z', updated_at: '2024-04-05T00:00:00Z', created_by: 'user-001', locked_at: '2024-04-05T00:00:00Z', locked_by: 'user-001' },
  { id: 'debit-002', debit_note_no: 'DN-2024-002', customer_id: 'cust-002', factory_id: 'factory-001', period_from: '2024-01-01', period_to: '2024-03-31', currency: 'JPY', total_amount: 450000, status: 'reviewed', notes: '', created_at: '2024-04-02T00:00:00Z', updated_at: '2024-04-03T00:00:00Z', created_by: 'user-001', locked_at: null, locked_by: null },
  { id: 'debit-003', debit_note_no: null, customer_id: 'cust-003', factory_id: 'factory-002', period_from: '2024-02-01', period_to: '2024-04-30', currency: 'JPY', total_amount: 0, status: 'draft', notes: 'Đang tổng hợp', created_at: '2024-04-10T00:00:00Z', updated_at: '2024-04-10T00:00:00Z', created_by: 'user-001', locked_at: null, locked_by: null },
];

export const MOCK_DEBIT_NOTE_ITEMS: DebitNoteItem[] = [
  { id: 'ditem-001', debit_note_id: 'debit-001', session_id: 'session-001', order_lot_id: 'lot-001', product_style_id: 'style-001', description: 'BR-1120 — Kiểm lần 1 (800 pcs)', first_inspection_qty: 800, reinspection_qty: 65, unit_price: 7.0, line_amount: 5600.0, currency: 'USD', created_at: '2024-04-01T00:00:00Z' },
  { id: 'ditem-002', debit_note_id: 'debit-001', session_id: 'session-001', order_lot_id: 'lot-001', product_style_id: 'style-001', description: 'BR-1120 — Tái kiểm 65 pcs', first_inspection_qty: 0, reinspection_qty: 65, unit_price: 10.0, line_amount: 650.0, currency: 'USD', created_at: '2024-04-01T00:00:00Z' },
];

export const MOCK_IMPORT_JOBS: ImportJob[] = [
  { id: 'job-001', original_filename: '060226ガードナー様TAN_PHUOC_AN工場で_BR-1120.csv', import_type: 'csv', status: 'committed', total_rows: 48, valid_rows: 48, error_rows: 0, committed_rows: 48, error_summary: null, template_detected: 'inspection_session', notes: '', created_at: '2024-02-06T09:00:00Z', updated_at: '2024-02-06T09:15:00Z', created_by: 'user-001' },
  { id: 'job-002', original_filename: 'order_lots_march_2024.csv', import_type: 'csv', status: 'failed', total_rows: 15, valid_rows: 12, error_rows: 3, committed_rows: null, error_summary: 'Dòng 5,9,13: Thiếu cột product_style_id', template_detected: 'order_lots', notes: '', created_at: '2024-03-01T10:00:00Z', updated_at: '2024-03-01T10:05:00Z', created_by: 'user-001' },
  { id: 'job-003', original_filename: 'quantity_log_week10.csv', import_type: 'csv', status: 'preview', total_rows: 30, valid_rows: 30, error_rows: 0, committed_rows: null, error_summary: null, template_detected: 'quantity_logs', notes: '', created_at: '2024-03-08T14:00:00Z', updated_at: '2024-03-08T14:02:00Z', created_by: 'user-001' },
  { id: 'job-004', original_filename: 'inspection_april.csv', import_type: 'csv', status: 'uploaded', total_rows: null, valid_rows: null, error_rows: null, committed_rows: null, error_summary: null, template_detected: null, notes: '', created_at: '2024-04-10T08:30:00Z', updated_at: '2024-04-10T08:30:00Z', created_by: 'user-001' },
  { id: 'job-005', original_filename: 'styles_update.csv', import_type: 'csv', status: 'cancelled', total_rows: 10, valid_rows: 8, error_rows: 2, committed_rows: null, error_summary: null, template_detected: 'product_styles', notes: '', created_at: '2024-03-20T11:00:00Z', updated_at: '2024-03-20T11:10:00Z', created_by: 'user-001' },
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: 'audit-001', user_id: 'user-001', action: 'update', entity_type: 'quantity_logs', entity_id: 'qlog-001', old_snapshot: { quantity: 480, log_date: '2024-03-01' }, new_snapshot: { quantity: 500, log_date: '2024-03-01' }, ip_address: '192.168.1.10', notes: null, created_at: '2024-03-01T10:00:00Z' },
  { id: 'audit-002', user_id: 'user-001', action: 'status_change', entity_type: 'inspection_sessions', entity_id: 'session-001', old_snapshot: { status: 'draft' }, new_snapshot: { status: 'submitted' }, ip_address: '192.168.1.10', notes: null, created_at: '2024-02-11T08:00:00Z' },
  { id: 'audit-003', user_id: 'user-001', action: 'status_change', entity_type: 'inspection_sessions', entity_id: 'session-001', old_snapshot: { status: 'submitted' }, new_snapshot: { status: 'approved' }, ip_address: '192.168.1.10', notes: null, created_at: '2024-02-12T09:00:00Z' },
  { id: 'audit-004', user_id: 'user-001', action: 'create', entity_type: 'order_lots', entity_id: 'lot-005', old_snapshot: null, new_snapshot: { lot_code: 'TPA-2024-003', order_qty: 4500 }, ip_address: '192.168.1.10', notes: null, created_at: '2024-03-01T07:00:00Z' },
  { id: 'audit-005', user_id: 'user-001', action: 'update', entity_type: 'inspection_sessions', entity_id: 'session-005', old_snapshot: { status: 'submitted' }, new_snapshot: { status: 'rejected', reason: 'Thiếu dữ liệu tái kiểm' }, ip_address: '192.168.1.10', notes: null, created_at: '2024-03-12T10:00:00Z' },
];

export const MOCK_APPROVAL_LOGS: ApprovalLog[] = [
  { id: 'app-001', entity_type: 'inspection_sessions', entity_id: 'session-001', from_status: 'draft', to_status: 'submitted', performed_by: 'user-001', reason: null, created_at: '2024-02-11T08:00:00Z' },
  { id: 'app-002', entity_type: 'inspection_sessions', entity_id: 'session-001', from_status: 'submitted', to_status: 'approved', performed_by: 'user-001', reason: null, created_at: '2024-02-12T09:00:00Z' },
  { id: 'app-003', entity_type: 'inspection_sessions', entity_id: 'session-001', from_status: 'approved', to_status: 'locked', performed_by: 'user-001', reason: null, created_at: '2024-02-13T10:00:00Z' },
  { id: 'app-004', entity_type: 'inspection_sessions', entity_id: 'session-002', from_status: 'draft', to_status: 'submitted', performed_by: 'user-001', reason: null, created_at: '2024-02-21T08:00:00Z' },
  { id: 'app-005', entity_type: 'inspection_sessions', entity_id: 'session-005', from_status: 'submitted', to_status: 'rejected', performed_by: 'user-001', reason: 'Thiếu dữ liệu tái kiểm', created_at: '2024-03-12T10:00:00Z' },
];

export const MOCK_DEFECT_CATALOGS: DefectCatalog[] = [
  { id: 'cat-001', code: 'SHOE-STD', name: 'Tiêu chuẩn lỗi giày', product_type_id: 'type-001', active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'cat-002', code: 'BAG-STD', name: 'Tiêu chuẩn lỗi túi', product_type_id: 'type-002', active: true, created_at: '2024-01-01T00:00:00Z' },
];

export const MOCK_DEFECT_CATALOG_ITEMS: DefectCatalogItem[] = [
  { id: 'dci-001', catalog_id: 'cat-001', code: 'D01', name_vn: 'Bong đế', name_jp: '底剥がれ', sort_order: 10, active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'dci-002', catalog_id: 'cat-001', code: 'D02', name_vn: 'Lỗi đường may', name_jp: '縫い目不良', sort_order: 20, active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'dci-003', catalog_id: 'cat-001', code: 'D03', name_vn: 'Màu không đều', name_jp: '色むら', sort_order: 30, active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'dci-004', catalog_id: 'cat-001', code: 'D04', name_vn: 'Keo dư', name_jp: '接着剤はみ出し', sort_order: 40, active: false, created_at: '2024-01-01T00:00:00Z' },
  { id: 'dci-005', catalog_id: 'cat-002', code: 'B01', name_vn: 'Rách vải', name_jp: '生地破れ', sort_order: 10, active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'dci-006', catalog_id: 'cat-002', code: 'B02', name_vn: 'Khoá bị hỏng', name_jp: 'ファスナー不良', sort_order: 20, active: true, created_at: '2024-01-01T00:00:00Z' },
];

export const MOCK_REPORT_TEMPLATES: ReportTemplate[] = [
  { id: 'tmpl-001', code: 'STD-SHOE-EN', name: 'Báo cáo giày (Excel)', customer_id: null, factory_id: null, defect_catalog_id: 'cat-001', export_format: 'excel', active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'tmpl-002', code: 'GARDNER-PDF', name: 'Gardner PDF Report', customer_id: 'cust-001', factory_id: 'factory-001', defect_catalog_id: 'cat-001', export_format: 'pdf', active: true, created_at: '2024-01-15T00:00:00Z' },
  { id: 'tmpl-003', code: 'TANAKA-CSV', name: 'Tanaka CSV Export', customer_id: 'cust-002', factory_id: null, defect_catalog_id: 'cat-001', export_format: 'csv', active: true, created_at: '2024-01-20T00:00:00Z' },
];

export const MOCK_PRICE_RULES: PriceRule[] = [
  { id: 'price-001', customer_id: null, factory_id: null, product_type_id: null, product_style_id: null, rule_type: 'first_inspection', unit_price: 8.0, currency: 'USD', effective_from: '2024-01-01', effective_to: null, priority: 1, active: true, notes: 'Giá mặc định kiểm lần đầu', created_at: '2024-01-01T00:00:00Z', created_by: 'user-001' },
  { id: 'price-002', customer_id: 'cust-001', factory_id: null, product_type_id: null, product_style_id: null, rule_type: 'first_inspection', unit_price: 12.5, currency: 'USD', effective_from: '2024-01-01', effective_to: null, priority: 2, active: true, notes: 'Giá kiểm Gardner', created_at: '2024-01-01T00:00:00Z', created_by: 'user-001' },
  { id: 'price-003', customer_id: null, factory_id: null, product_type_id: null, product_style_id: 'style-001', rule_type: 'first_inspection', unit_price: 7.0, currency: 'USD', effective_from: '2024-01-01', effective_to: '2024-12-31', priority: 3, active: true, notes: 'Giá riêng BR-1120', created_at: '2024-01-15T00:00:00Z', created_by: 'user-001' },
  { id: 'price-004', customer_id: null, factory_id: null, product_type_id: null, product_style_id: null, rule_type: 'reinspection', unit_price: 12.0, currency: 'USD', effective_from: '2024-01-01', effective_to: null, priority: 1, active: true, notes: 'Giá tái kiểm mặc định', created_at: '2024-01-01T00:00:00Z', created_by: 'user-001' },
];

export const MOCK_USER_PERMISSIONS: UserFactoryPermission[] = [
  { id: 'perm-001', user_id: 'user-002', factory_id: 'factory-001', access_level: 'read_write', created_at: '2024-01-01T00:00:00Z', created_by: 'user-001' },
  { id: 'perm-002', user_id: 'user-002', factory_id: 'factory-002', access_level: 'read_only', created_at: '2024-01-01T00:00:00Z', created_by: 'user-001' },
  { id: 'perm-003', user_id: 'user-003', factory_id: 'factory-001', access_level: 'read_only', created_at: '2024-01-10T00:00:00Z', created_by: 'user-001' },
];

export const MOCK_USERS = [
  { id: 'user-001', name_vn: 'Nguyễn Quản Lý', role: 'manager' },
  { id: 'user-002', name_vn: 'Trần Tổ Trưởng', role: 'leader' },
  { id: 'user-003', name_vn: 'Lê Nhân Viên', role: 'staff' },
];

export function getCustomerById(id: string) {
  return MOCK_CUSTOMERS.find(c => c.id === id);
}

export function getFactoryById(id: string) {
  return MOCK_FACTORIES.find(f => f.id === id);
}

export function getStyleById(id: string) {
  return MOCK_PRODUCT_STYLES.find(s => s.id === id);
}

export function getLotById(id: string) {
  return MOCK_ORDER_LOTS.find(l => l.id === id);
}
