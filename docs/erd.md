# Entity Relationship Diagram (Text)

## Master Data Cluster

```
customers (1) ──── (M) product_styles
customers (1) ──── (M) order_lots (via product_styles)
customers (1) ──── (M) price_rules
customers (1) ──── (M) inspection_sessions
customers (1) ──── (M) debit_notes
customers (1) ──── (1) report_templates (nullable)

factories (1) ──── (M) order_lots
factories (1) ──── (M) price_rules
factories (1) ──── (M) inspection_sessions
factories (1) ──── (M) debit_notes
factories (1) ──── (M) user_factory_permissions

product_styles (1) ──── (M) order_lots
product_styles (1) ──── (M) inspection_sessions
product_styles (1) ──── (M) price_rules (nullable)
product_styles (1) ──── (M) debit_note_items (denormalized)

order_lots (1) ──── (M) quantity_logs
order_lots (1) ──── (M) inspection_sessions
order_lots (1) ──── (M) price_rules (nullable)
order_lots (1) ──── (M) debit_note_items

report_templates (1) ──── (M) inspection_sessions
report_templates (1) ──── (1) defect_catalogs

defect_catalogs (1) ──── (M) defect_catalog_items
defect_catalog_items (1) ──── (M) inspection_defect_records
```

## Transactional Cluster

```
inspection_sessions (1) ──── (M) inspection_lines
inspection_lines (1) ──── (M) inspection_defect_records

profiles (1) ──── (M) inspection_sessions (as inspector_id)
profiles (1) ──── (M) inspection_sessions (as supervisor_id)
profiles (1) ──── (M) inspection_sessions (as submitted_by, approved_by, locked_by)

profiles (1) ──── (M) quantity_logs (as created_by)
```

## Finance Cluster

```
debit_notes (1) ──── (M) debit_note_items
debit_note_items (M) ──── (1) order_lots
debit_note_items (M) ──── (1) product_styles
debit_note_items (M) ──── (1) price_rules (nullable)
debit_note_items — source_session_ids uuid[] → inspection_sessions (M:M denormalized array)
```

## Import Cluster

```
import_jobs (1) ──── (M) import_staging_rows
profiles (1) ──── (M) import_jobs (as created_by)
import_staging_rows.committed_entity_id → any entity (polymorphic)
```

## Governance Cluster

```
profiles (1) ──── (M) audit_logs (as user_id)
audit_logs.entity_id → any entity (polymorphic by entity_type)
```

## Auth Cluster

```
auth.users (1) ──── (1) profiles
profiles (1) ──── (M) user_factory_permissions
factories (1) ──── (M) user_factory_permissions
```

---

## Key Cardinalities Summary

| Relationship | Cardinality | Notes |
|-------------|------------|-------|
| customer → product_styles | 1:M | A product style belongs to one customer |
| product_style → order_lots | 1:M | One style can have multiple orders/lots |
| order_lot → quantity_logs | 1:M | One log per lot per date |
| order_lot → inspection_sessions | 1:M | Multiple inspections for same lot |
| inspection_session → inspection_lines | 1:M | One line per color/size |
| inspection_line → defect_records | 1:M | One record per defect type |
| debit_note → debit_items | 1:M | One item per order_lot per charge_type |
| import_job → staging_rows | 1:M | One row per parsed row |

---

## Important Design Notes

1. **product_styles vs order_lots split**: Critical. Never merge them. One style code
   can appear in multiple contracts/lots over time.

2. **inspection_sessions.source_session_ids on debit_note_items**: Stored as uuid[]
   for traceability. This is acceptable because debit_note_items are write-once.

3. **No hard-coded column-per-day**: All dated data is stored as row records with
   a `date` field. This replaces the Excel pattern of columns per day.

4. **Soft deletes**: All master data uses `is_active` boolean, not DELETE.

5. **Audit log polymorphism**: `entity_type` is a text field (table name). Acceptable
   for audit-only use case; not used for foreign key joins.
