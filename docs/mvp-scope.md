# TAIYO NISSHIN VIETNAM — MVP Scope

## System Purpose

Replace manual Excel-based workflows for:
1. Daily inspection report entry (per product/order/color/size)
2. Production quantity tracking per order lot
3. Auto-summarizing data across all reports
4. Generating debit notes from approved reports
5. Exporting Excel files matching existing customer templates

## Current State (Excel Workflow)

1. Inspectors fill per-day sheets in product-specific Excel files
2. Each file has per-day sheets + 1 TOTAL sheet (cumulative)
3. Manager manually copies TOTAL to a master summary file
4. Accounting generates debit notes from the master summary
5. Same data exists in multiple files → risk of human error

## MVP Scope Boundary

### In Scope

| Module | Description |
|--------|-------------|
| Auth + Roles | 4 roles: staff, leader, manager, accounting_admin |
| Master Data | customers, factories, product_styles, order_lots, price_rules, defect_catalogs, report_templates |
| Inspection Reports | Full CRUD with color/size line items, defect tracking, approval workflow |
| Production Quantity | Daily quantity log per order lot, progress tracking |
| Debit Note Generation | Auto-generate from approved reports with price rules |
| Excel Export | Inspection report export, debit note export, summary export |
| Dashboard | KPI summary for managers |
| Audit Log | All write actions tracked |
| Import (Historical) | Staging-based import from old Excel files |

### Out of Scope (MVP)

- Inventory / WIP tracking
- Equipment / machine tracking
- Supplier / material tracking
- SPC (Statistical Process Control) charts
- Payroll / labor cost
- Shift scheduling / capacity planning
- Mobile app

## Known Customers and Factories

| Customer | Factory | Template Family |
|----------|---------|----------------|
| FITFIT | T&K | FITFIT/TK |
| Gardner | TAN PHUOC AN | Gardner/TPA |

## Assumptions

1. One product style can belong to multiple order lots (M:N via order_lots)
2. Defect catalogs differ by product_type (SHOES vs APPAREL) and may differ by template
3. Currency is JPY by default; price rules define currency per customer/order
4. Debit is charged based on accepted_qty (first pass + reinspection passed)
5. Reports must be `approved` before being eligible for debit generation
6. Locked reports and locked debits are immutable (no edits)
7. Import history data does not go through approval workflow — imported with status `imported_locked`
8. All users scoped to factory they are assigned to (except manager/accounting_admin)
