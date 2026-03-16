# Business Rules

## BR-01: Quantity Constraints

| Rule | Description |
|------|-------------|
| BR-01.1 | `inspected_qty` >= 0 always |
| BR-01.2 | `defect_qty` >= 0 always |
| BR-01.3 | `first_pass_good_qty` >= 0 always |
| BR-01.4 | `reinspection_qty` >= 0 always |
| BR-01.5 | `reinspection_good_qty` <= `reinspection_qty` |
| BR-01.6 | `defect_qty` <= `inspected_qty` |
| BR-01.7 | `first_pass_good_qty` + `defect_qty` <= `inspected_qty` (some may be pending) |
| BR-01.8 | `quantity_logs.quantity` >= 0 |
| BR-01.9 | `order_qty` > 0 |
| BR-01.10 | All prices >= 0 |

## BR-02: Derived Calculations (Service Layer Only)

| Field | Formula |
|-------|---------|
| accepted_qty (per line) | first_pass_good_qty + reinspection_good_qty |
| defect_rate (per line) | defect_qty / inspected_qty; return 0.0 if inspected_qty = 0 |
| accepted_qty_total (per session) | SUM of line accepted_qty |
| inspected_qty_total (per session) | SUM of line inspected_qty |
| defect_qty_total (per session) | SUM of line defect_qty |
| session_defect_rate | defect_qty_total / inspected_qty_total; 0 if denom = 0 |
| produced_qty_total (per order_lot) | SUM of quantity_logs.quantity |
| remaining_qty (per order_lot) | order_qty - produced_qty_total |
| progress_pct (per order_lot) | produced_qty_total / order_qty; 0 if order_qty = 0 |
| debit_line_amount | charge_qty * unit_price |
| debit_total | SUM of debit_note_items.line_amount |

**CRITICAL**: These calculations must ONLY exist in `src/services/`. Never duplicate in UI components.

## BR-03: Warnings (Display Only — Do Not Block)

| Code | Condition | Message |
|------|-----------|---------|
| W-01 | remaining_qty < 0 | Production exceeds order quantity |
| W-02 | accepted_qty_total > order_qty | Accepted quantity exceeds order |
| W-03 | session_defect_rate > defect_threshold | Defect rate exceeds threshold |
| W-04 | shipment_qty > accepted_qty (per line) | Shipment qty exceeds accepted |
| W-05 | price_rule not found for order_lot | No price rule — debit cannot be generated |
| W-06 | duplicate import suspected | Same date/lot/product already has data |

**Assumption**: Default defect threshold = 0.15 (15%). TODO: Make this configurable per customer/product_type in `report_templates` or a `config` table.

## BR-04: Approval Workflow

```
draft → submitted → approved → locked
```

| Transition | Required Role | Reversible? |
|-----------|--------------|-------------|
| draft → submitted | staff, leader, manager | Yes (back to draft) |
| submitted → approved | leader, manager | Yes (back to submitted) |
| approved → locked | manager | NO — irreversible |
| locked → approved | manager (special unlock) | Only with audit log entry |

**Rule BR-04.1**: Locked reports cannot be edited at field level. Any unlock attempt must be logged in audit_logs with reason.

**Rule BR-04.2**: Reports with status `imported_locked` are treated identically to `locked`. They cannot be edited via UI.

## BR-05: Debit Generation Rules

| Rule | Description |
|------|-------------|
| BR-05.1 | Only `approved` or `locked` sessions are eligible for debit |
| BR-05.2 | A session already referenced in a `locked` debit_note cannot be re-debited |
| BR-05.3 | A session referenced in a `draft` or `submitted` debit can still be moved to another debit (edge case: log warning) |
| BR-05.4 | price_rule resolution: order_lot > product_style > factory > customer (most specific wins) |
| BR-05.5 | If no price_rule found, debit_note_item.unit_price = 0 with warning |
| BR-05.6 | charge_type = first_inspection uses inspected_qty_total per session |
| BR-05.7 | charge_type = reinspection uses reinspection_qty_total per session (if template has reinspection) |
| BR-05.8 | Debit note currency = customer.currency by default; price_rule.currency overrides |

**Assumption**: Charging is based on inspected_qty (total qty checked), not defect_qty. TODO: Confirm with business — some contracts may charge only on defect qty.

## BR-06: Import Rules

| Rule | Description |
|------|-------------|
| BR-06.1 | Always go through staging: never commit directly to main tables |
| BR-06.2 | Duplicate detection: warn if same (order_lot, inspection_date, color, size) already exists |
| BR-06.3 | Missing required fields = error row, skip row but continue parsing |
| BR-06.4 | Unrecognized template = warn and require manual template selection |
| BR-06.5 | Imported sessions get status = imported_locked after commit |
| BR-06.6 | Import job logs: total_rows, valid_rows, error_rows, committed_rows |
| BR-06.7 | All import_staging_rows retained for audit purposes, never deleted |
| BR-06.8 | Failed rows are logged with validation_errors; user can download error report |

## BR-07: Data Deletion Rules

| Entity | Rule |
|--------|------|
| customers | Soft-delete only (is_active = false). Block if active order_lots exist. |
| factories | Soft-delete only. Block if active order_lots exist. |
| product_styles | Soft-delete only. Block if order_lots exist. |
| order_lots | Soft-delete only. Block if quantity_logs or inspection_sessions exist. |
| defect_catalog_items | Soft-delete only. Block if referenced in inspection_defect_records. |
| inspection_sessions | Soft-delete only if status = draft. Locked/approved = no delete. |
| debit_notes | No delete at any status. Mark cancelled instead. |
| quantity_logs | Allow delete only if order_lot.status = active AND log created < 24h ago by same user. Otherwise require manager override. |
| audit_logs | Never delete. |
| import_staging_rows | Never delete. |

## BR-08: Role-Based Data Access

| Role | Can See | Can Edit | Can Approve | Can Lock | Can Generate Debit |
|------|---------|---------|-------------|---------|-------------------|
| staff | Own factory data | Draft records in own factory | No | No | No |
| leader | Assigned factory data | Submitted records in assigned factory | Yes (approve inspection) | No | No |
| manager | All data | Any draft/submitted | Yes (all) | Yes | No |
| accounting_admin | All data | Debit notes only | No | Yes (debit) | Yes |

**Rule BR-08.1**: `user_factory_permissions` table governs which factories a staff/leader can access.
**Rule BR-08.2**: manager and accounting_admin bypass factory restrictions.
**Rule BR-08.3**: Permission checks must occur at both UI level (navigation/button visibility) and API/RLS level.

## BR-09: Locking Behavior

| Entity | When Locked | What Is Blocked |
|--------|------------|-----------------|
| inspection_sessions | status = locked or imported_locked | All field edits, line item add/edit/delete, status change (except manager unlock) |
| debit_notes | status = locked | All edits, new items, delete |
| quantity_logs | After 24h AND order_lot.status != active | Requires manager override |

## BR-10: Price Rule Specificity Resolution

When multiple price_rules match for a debit line item, apply this priority (most specific wins):

1. order_lot_id matches
2. product_style_id matches (and order_lot_id is null)
3. factory_id matches (and product_style_id is null)
4. customer_id matches (and factory_id is null)

If two rules have same specificity and overlapping effective dates → log warning, use most recently created.

## Open Items / TODOs

- TODO: Confirm debit charging basis (inspected_qty vs defect_qty vs accepted_qty)
- TODO: Confirm defect rate threshold per customer/product_type (currently assumed 15%)
- TODO: Confirm if reinspection charges are on reinspection_qty or reinspection_defect_qty
- TODO: Clarify what happens if Gardner and TPA templates have different defect catalogs — currently assumed separate catalog per template
- TODO: Define debit_no auto-generation format (currently assumed DN-YYYY-NNN)
- TODO: Confirm if multiple currencies per debit note are allowed
