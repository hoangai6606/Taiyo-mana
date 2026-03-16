# Data Dictionary

## MASTER DATA TABLES

### customers
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | System ID |
| code | text UNIQUE | Short identifier e.g. FITFIT, GARDNER |
| name | text | Full customer name |
| name_jp | text | Japanese name |
| currency | text | Default billing currency (JPY, USD, VND) |
| is_active | boolean | Soft-delete flag |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| created_by | uuid FK profiles | |

### factories
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | System ID |
| code | text UNIQUE | Short identifier e.g. TK, TPA |
| name | text | Full factory name |
| name_jp | text | Japanese name |
| country | text | Default: VN |
| is_active | boolean | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| created_by | uuid FK profiles | |

### product_styles
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | |
| customer_id | uuid FK customers | Which customer owns this style |
| style_code | text | e.g. BR-1120 |
| name | text | Style description |
| product_type | text ENUM | SHOES or APPAREL |
| is_active | boolean | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| created_by | uuid FK profiles | |
| UNIQUE(customer_id, style_code) | | Same code can exist for different customers |

### order_lots
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | |
| product_style_id | uuid FK product_styles | Parent product style |
| factory_id | uuid FK factories | Which factory produces |
| lot_code | text | Internal lot identifier e.g. BR-1120-LOT1 |
| contract_no | text | Customer contract/PO number |
| debit_group | text | Debit grouping code |
| order_qty | integer | Total ordered quantity |
| unit | text | Default: pairs (đôi) or pcs |
| status | text ENUM | active, completed, cancelled |
| delivery_date | date | Target delivery |
| notes | text | |
| is_active | boolean | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| created_by | uuid FK profiles | |

### price_rules
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | |
| customer_id | uuid FK customers | |
| factory_id | uuid FK factories | nullable = applies to all factories |
| product_style_id | uuid FK product_styles | nullable = applies to all styles |
| order_lot_id | uuid FK order_lots | nullable = applies to all lots; most specific wins |
| rule_type | text ENUM | first_inspection, reinspection |
| unit_price | numeric(12,4) | Price per unit |
| currency | text | JPY, USD, VND |
| effective_from | date | |
| effective_to | date | nullable = open-ended |
| notes | text | |
| is_active | boolean | |
| created_at | timestamptz | |
| created_by | uuid FK profiles | |

**Note (price rule resolution)**: When multiple rules match, use most-specific: order_lot > product_style > factory > customer

### defect_catalogs
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | |
| code | text UNIQUE | e.g. SHOES_STANDARD, APPAREL_FITFIT |
| name | text | |
| product_type | text ENUM | SHOES, APPAREL, ANY |
| template_code | text | nullable — links to report_template if needed |
| is_active | boolean | |
| created_at | timestamptz | |

### defect_catalog_items
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | |
| catalog_id | uuid FK defect_catalogs | |
| code | text | e.g. S01, A01 |
| name_vn | text | Vietnamese name |
| name_jp | text | Japanese name |
| sort_order | integer | Display order |
| is_active | boolean | |
| UNIQUE(catalog_id, code) | | |

### report_templates
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | |
| code | text UNIQUE | e.g. FITFIT_TK, GARDNER_TPA |
| name | text | Human-readable |
| customer_id | uuid FK customers | nullable = generic |
| defect_catalog_id | uuid FK defect_catalogs | Which defect list to use |
| has_reinspection | boolean | Template includes reinspection columns |
| has_shipment_qty | boolean | Template includes shipment qty column |
| export_template_key | text | Key mapping to xlsx template file |
| is_active | boolean | |
| created_at | timestamptz | |

### profiles (extends auth.users)
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK FK auth.users | |
| name_vn | text | Vietnamese name |
| name_jp | text | Japanese name |
| role | text ENUM | staff, leader, manager, accounting_admin |
| is_active | boolean | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### user_factory_permissions
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | |
| user_id | uuid FK profiles | |
| factory_id | uuid FK factories | |
| can_view | boolean DEFAULT true | |
| can_edit | boolean DEFAULT false | |
| granted_by | uuid FK profiles | |
| granted_at | timestamptz | |
| UNIQUE(user_id, factory_id) | | |

---

## TRANSACTIONAL TABLES

### quantity_logs
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | |
| order_lot_id | uuid FK order_lots | |
| log_date | date | Date of production |
| quantity | integer | Quantity produced that day |
| notes | text | |
| created_by | uuid FK profiles | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| UNIQUE(order_lot_id, log_date) | | One entry per lot per day |

### inspection_sessions
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | |
| session_no | text | Auto-generated reference number |
| product_style_id | uuid FK product_styles | |
| order_lot_id | uuid FK order_lots | nullable |
| factory_id | uuid FK factories | |
| customer_id | uuid FK customers | |
| template_id | uuid FK report_templates | |
| inspection_date | date | |
| inspector_id | uuid FK profiles | User who did inspection |
| supervisor_id | uuid FK profiles | nullable — on-site supervisor |
| status | text ENUM | draft, submitted, approved, locked, imported_locked |
| submitted_at | timestamptz | |
| submitted_by | uuid FK profiles | |
| approved_at | timestamptz | |
| approved_by | uuid FK profiles | |
| locked_at | timestamptz | |
| locked_by | uuid FK profiles | |
| notes | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| created_by | uuid FK profiles | |

### inspection_lines
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | |
| session_id | uuid FK inspection_sessions CASCADE | |
| color | text | Color/variant |
| size_label | text | Size label (can be text: S, M, L, 40, 41…) |
| inspected_qty | integer DEFAULT 0 CHECK >= 0 | Total inspected |
| first_pass_good_qty | integer DEFAULT 0 CHECK >= 0 | Passed on first inspection |
| defect_qty | integer DEFAULT 0 CHECK >= 0 | Defects found |
| reinspection_qty | integer DEFAULT 0 CHECK >= 0 | Sent for reinspection |
| reinspection_good_qty | integer DEFAULT 0 CHECK >= 0 | Passed reinspection |
| shipment_qty | integer DEFAULT 0 CHECK >= 0 | Actual shipment qty |
| notes | text | |
| sort_order | integer | Display order |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Derived (computed in service layer, not stored)**:
- `accepted_qty` = first_pass_good_qty + reinspection_good_qty
- `defect_rate` = defect_qty / inspected_qty (0 if inspected_qty = 0)

### inspection_defect_records
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | |
| line_id | uuid FK inspection_lines CASCADE | |
| catalog_item_id | uuid FK defect_catalog_items | |
| defect_qty | integer DEFAULT 0 CHECK >= 0 | |
| notes | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| UNIQUE(line_id, catalog_item_id) | | |

---

## FINANCE / OUTPUT TABLES

### debit_notes
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | |
| debit_no | text UNIQUE | Auto-generated e.g. DN-2026-001 |
| customer_id | uuid FK customers | |
| factory_id | uuid FK factories | |
| period_from | date | Period start |
| period_to | date | Period end |
| currency | text | |
| subtotal | numeric(14,4) | Sum of line amounts (before any adjustments) |
| total_amount | numeric(14,4) | Final amount |
| status | text ENUM | draft, submitted, approved, locked |
| notes | text | |
| generated_at | timestamptz | When generated |
| generated_by | uuid FK profiles | |
| approved_at | timestamptz | |
| approved_by | uuid FK profiles | |
| locked_at | timestamptz | |
| locked_by | uuid FK profiles | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### debit_note_items
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | |
| debit_note_id | uuid FK debit_notes CASCADE | |
| order_lot_id | uuid FK order_lots | |
| product_style_id | uuid FK product_styles | Denormalized for report |
| price_rule_id | uuid FK price_rules | nullable — which rule was applied |
| charge_type | text ENUM | first_inspection, reinspection |
| charge_qty | integer | Quantity being charged |
| unit_price | numeric(12,4) | Price at time of debit generation |
| currency | text | |
| line_amount | numeric(14,4) | charge_qty * unit_price |
| source_session_ids | uuid[] | Array of inspection_session IDs that contributed |
| notes | text | |
| created_at | timestamptz | |

---

## IMPORT TABLES

### import_jobs
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | |
| job_no | text UNIQUE | Auto-generated |
| import_type | text ENUM | inspection_report, quantity_log, master_data |
| template_detected | text | Template family identified |
| status | text ENUM | pending, parsing, preview_ready, confirming, committed, failed, cancelled |
| total_rows | integer | Total rows in file |
| valid_rows | integer | Rows passed validation |
| error_rows | integer | Rows with errors |
| committed_rows | integer | Rows successfully written |
| file_name | text | Original filename |
| file_size_bytes | integer | |
| notes | text | |
| created_by | uuid FK profiles | Who uploaded |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### import_staging_rows
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | |
| job_id | uuid FK import_jobs CASCADE | |
| row_index | integer | Original row number in file |
| raw_data | jsonb | Full raw row as parsed |
| mapped_data | jsonb | After field mapping |
| validation_status | text ENUM | valid, warning, error, skipped |
| validation_errors | jsonb | Array of error objects |
| validation_warnings | jsonb | Array of warning objects |
| committed | boolean DEFAULT false | |
| committed_entity_id | uuid | ID of created record |
| created_at | timestamptz | |

---

## GOVERNANCE TABLES

### audit_logs
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | |
| user_id | uuid FK profiles | Who performed the action |
| action | text ENUM | create, update, delete, submit, approve, lock, unlock, import, export, generate_debit |
| entity_type | text | Table/entity name |
| entity_id | uuid | ID of affected record |
| before_data | jsonb | Snapshot before change (nullable) |
| after_data | jsonb | Snapshot after change (nullable) |
| ip_address | text | nullable |
| user_agent | text | nullable |
| notes | text | Optional reason/comment |
| created_at | timestamptz | |

---

## STATUS ENUMS

### inspection_sessions.status
| Value | Meaning |
|-------|---------|
| draft | Being entered by inspector |
| submitted | Submitted for supervisor review |
| approved | Approved, eligible for debit |
| locked | Immutable, debit has been generated |
| imported_locked | Imported from historical Excel, treated as locked |

### order_lots.status
| Value | Meaning |
|-------|---------|
| active | In production |
| completed | All qty produced, all reports done |
| cancelled | Cancelled |

### debit_notes.status
| Value | Meaning |
|-------|---------|
| draft | Being built |
| submitted | Sent for review |
| approved | Reviewed and approved |
| locked | Final, immutable |

### import_jobs.status
| Value | Meaning |
|-------|---------|
| pending | Uploaded, not yet parsed |
| parsing | Being parsed |
| preview_ready | Parsed, waiting for user review |
| confirming | User clicked confirm, writing to DB |
| committed | Fully written |
| failed | Fatal error |
| cancelled | Cancelled by user |
