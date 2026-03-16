/*
  # V2 Schema Part 2a — Transactional tables with simple RLS (no UFP cross-reference yet)
  UFP-based factory isolation RLS is added in part 2b after all tables are created.
*/

-- ============================================================
-- quantity_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS quantity_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_lot_id  uuid NOT NULL REFERENCES order_lots(id),
  log_date      date NOT NULL,
  quantity      integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  notes         text NOT NULL DEFAULT '',
  created_by    uuid REFERENCES profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_lot_id, log_date)
);
DROP TRIGGER IF EXISTS quantity_logs_updated_at ON quantity_logs;
CREATE TRIGGER quantity_logs_updated_at BEFORE UPDATE ON quantity_logs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE quantity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quantity_logs_select" ON quantity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "quantity_logs_insert" ON quantity_logs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));
CREATE POLICY "quantity_logs_update" ON quantity_logs FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','accounting_admin'))
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','accounting_admin'))
  );

-- ============================================================
-- inspection_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS inspection_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_no       text UNIQUE NOT NULL DEFAULT '',
  product_style_id uuid NOT NULL REFERENCES product_styles(id),
  order_lot_id     uuid REFERENCES order_lots(id),
  factory_id       uuid NOT NULL REFERENCES factories(id),
  customer_id      uuid NOT NULL REFERENCES customers(id),
  template_id      uuid REFERENCES report_templates(id),
  inspection_date  date NOT NULL,
  inspector_id     uuid REFERENCES profiles(id),
  supervisor_id    uuid REFERENCES profiles(id),
  status           text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','approved','locked','imported_locked')),
  submitted_at     timestamptz,
  submitted_by     uuid REFERENCES profiles(id),
  approved_at      timestamptz,
  approved_by      uuid REFERENCES profiles(id),
  locked_at        timestamptz,
  locked_by        uuid REFERENCES profiles(id),
  notes            text NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES profiles(id)
);
DROP TRIGGER IF EXISTS inspection_sessions_updated_at ON inspection_sessions;
CREATE TRIGGER inspection_sessions_updated_at BEFORE UPDATE ON inspection_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE inspection_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "isessions_select" ON inspection_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "isessions_insert" ON inspection_sessions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));
CREATE POLICY "isessions_update" ON inspection_sessions FOR UPDATE TO authenticated
  USING (
    status NOT IN ('locked','imported_locked')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
  )
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));

-- ============================================================
-- inspection_lines
-- ============================================================
CREATE TABLE IF NOT EXISTS inspection_lines (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            uuid NOT NULL REFERENCES inspection_sessions(id) ON DELETE CASCADE,
  color                 text NOT NULL DEFAULT '',
  size_label            text NOT NULL DEFAULT '',
  inspected_qty         integer NOT NULL DEFAULT 0 CHECK (inspected_qty >= 0),
  first_pass_good_qty   integer NOT NULL DEFAULT 0 CHECK (first_pass_good_qty >= 0),
  defect_qty            integer NOT NULL DEFAULT 0 CHECK (defect_qty >= 0),
  reinspection_qty      integer NOT NULL DEFAULT 0 CHECK (reinspection_qty >= 0),
  reinspection_good_qty integer NOT NULL DEFAULT 0 CHECK (reinspection_good_qty >= 0),
  shipment_qty          integer NOT NULL DEFAULT 0 CHECK (shipment_qty >= 0),
  notes                 text NOT NULL DEFAULT '',
  sort_order            integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS inspection_lines_updated_at ON inspection_lines;
CREATE TRIGGER inspection_lines_updated_at BEFORE UPDATE ON inspection_lines FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE inspection_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ilines_select" ON inspection_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "ilines_insert" ON inspection_lines FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspection_sessions s
      WHERE s.id = session_id AND s.status NOT IN ('locked','imported_locked')
    )
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "ilines_update" ON inspection_lines FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_sessions s
      WHERE s.id = inspection_lines.session_id
        AND (
          s.status NOT IN ('locked','imported_locked')
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
        )
    )
  )
  WITH CHECK (true);
CREATE POLICY "ilines_delete" ON inspection_lines FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_sessions s
      WHERE s.id = inspection_lines.session_id AND s.status = 'draft'
    )
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
  );

-- ============================================================
-- inspection_defect_records
-- ============================================================
CREATE TABLE IF NOT EXISTS inspection_defect_records (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id          uuid NOT NULL REFERENCES inspection_lines(id) ON DELETE CASCADE,
  catalog_item_id  uuid NOT NULL REFERENCES defect_catalog_items(id),
  defect_qty       integer NOT NULL DEFAULT 0 CHECK (defect_qty >= 0),
  notes            text NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(line_id, catalog_item_id)
);
DROP TRIGGER IF EXISTS idefect_records_updated_at ON inspection_defect_records;
CREATE TRIGGER idefect_records_updated_at BEFORE UPDATE ON inspection_defect_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE inspection_defect_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "idefect_select" ON inspection_defect_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "idefect_insert" ON inspection_defect_records FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspection_lines il
      JOIN inspection_sessions s ON s.id = il.session_id
      WHERE il.id = line_id AND s.status NOT IN ('locked','imported_locked')
    )
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "idefect_update" ON inspection_defect_records FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_lines il
      JOIN inspection_sessions s ON s.id = il.session_id
      WHERE il.id = inspection_defect_records.line_id
        AND (
          s.status NOT IN ('locked','imported_locked')
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
        )
    )
  )
  WITH CHECK (true);
CREATE POLICY "idefect_delete" ON inspection_defect_records FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_lines il
      JOIN inspection_sessions s ON s.id = il.session_id
      WHERE il.id = inspection_defect_records.line_id AND s.status = 'draft'
    )
  );

-- ============================================================
-- debit_notes
-- ============================================================
CREATE TABLE IF NOT EXISTS debit_notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debit_no      text UNIQUE NOT NULL DEFAULT '',
  customer_id   uuid NOT NULL REFERENCES customers(id),
  factory_id    uuid NOT NULL REFERENCES factories(id),
  period_from   date NOT NULL,
  period_to     date NOT NULL,
  currency      text NOT NULL DEFAULT 'JPY',
  subtotal      numeric(14,4) NOT NULL DEFAULT 0,
  total_amount  numeric(14,4) NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','approved','locked')),
  notes         text NOT NULL DEFAULT '',
  generated_at  timestamptz,
  generated_by  uuid REFERENCES profiles(id),
  approved_at   timestamptz,
  approved_by   uuid REFERENCES profiles(id),
  locked_at     timestamptz,
  locked_by     uuid REFERENCES profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS debit_notes_updated_at ON debit_notes;
CREATE TRIGGER debit_notes_updated_at BEFORE UPDATE ON debit_notes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE debit_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "debit_notes_select" ON debit_notes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','accounting_admin')));
CREATE POLICY "debit_notes_insert" ON debit_notes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'accounting_admin'));
CREATE POLICY "debit_notes_update" ON debit_notes FOR UPDATE TO authenticated
  USING (status != 'locked' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','accounting_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','accounting_admin')));

CREATE TABLE IF NOT EXISTS debit_note_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debit_note_id       uuid NOT NULL REFERENCES debit_notes(id) ON DELETE CASCADE,
  order_lot_id        uuid NOT NULL REFERENCES order_lots(id),
  product_style_id    uuid NOT NULL REFERENCES product_styles(id),
  price_rule_id       uuid REFERENCES price_rules(id),
  charge_type         text NOT NULL DEFAULT 'first_inspection'
    CHECK (charge_type IN ('first_inspection','reinspection')),
  charge_qty          integer NOT NULL DEFAULT 0 CHECK (charge_qty >= 0),
  unit_price          numeric(12,4) NOT NULL DEFAULT 0,
  currency            text NOT NULL DEFAULT 'JPY',
  line_amount         numeric(14,4) NOT NULL DEFAULT 0,
  source_session_ids  uuid[] NOT NULL DEFAULT '{}',
  notes               text NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE debit_note_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debit_items_select" ON debit_note_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','accounting_admin')));
CREATE POLICY "debit_items_insert" ON debit_note_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'accounting_admin'));
CREATE POLICY "debit_items_update" ON debit_note_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM debit_notes dn
      WHERE dn.id = debit_note_id AND dn.status != 'locked'
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','accounting_admin'))
    )
  )
  WITH CHECK (true);

-- ============================================================
-- import_jobs + staging
-- ============================================================
CREATE TABLE IF NOT EXISTS import_jobs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_no            text UNIQUE NOT NULL DEFAULT '',
  import_type       text NOT NULL DEFAULT 'inspection_report'
    CHECK (import_type IN ('inspection_report','quantity_log','master_data')),
  template_detected text NOT NULL DEFAULT '',
  status            text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','parsing','preview_ready','confirming','committed','failed','cancelled')),
  total_rows        integer NOT NULL DEFAULT 0,
  valid_rows        integer NOT NULL DEFAULT 0,
  error_rows        integer NOT NULL DEFAULT 0,
  committed_rows    integer NOT NULL DEFAULT 0,
  file_name         text NOT NULL DEFAULT '',
  file_size_bytes   integer NOT NULL DEFAULT 0,
  notes             text NOT NULL DEFAULT '',
  created_by        uuid REFERENCES profiles(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS import_jobs_updated_at ON import_jobs;
CREATE TRIGGER import_jobs_updated_at BEFORE UPDATE ON import_jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "import_jobs_select" ON import_jobs FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','accounting_admin')));
CREATE POLICY "import_jobs_insert" ON import_jobs FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "import_jobs_update" ON import_jobs FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'))
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS import_staging_rows (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id               uuid NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_index            integer NOT NULL,
  raw_data             jsonb NOT NULL DEFAULT '{}',
  mapped_data          jsonb NOT NULL DEFAULT '{}',
  validation_status    text NOT NULL DEFAULT 'valid'
    CHECK (validation_status IN ('valid','warning','error','skipped')),
  validation_errors    jsonb NOT NULL DEFAULT '[]',
  validation_warnings  jsonb NOT NULL DEFAULT '[]',
  committed            boolean NOT NULL DEFAULT false,
  committed_entity_id  uuid,
  created_at           timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE import_staging_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staging_select" ON import_staging_rows FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM import_jobs j
      WHERE j.id = import_staging_rows.job_id
        AND (j.created_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','accounting_admin')))
    )
  );
CREATE POLICY "staging_insert" ON import_staging_rows FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM import_jobs j WHERE j.id = job_id AND j.created_by = auth.uid()));

-- ============================================================
-- audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES profiles(id),
  action       text NOT NULL,
  entity_type  text NOT NULL,
  entity_id    uuid,
  before_data  jsonb,
  after_data   jsonb,
  ip_address   text,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','accounting_admin')));
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_product_styles_customer ON product_styles(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_lots_style ON order_lots(product_style_id);
CREATE INDEX IF NOT EXISTS idx_order_lots_factory ON order_lots(factory_id);
CREATE INDEX IF NOT EXISTS idx_quantity_logs_lot ON quantity_logs(order_lot_id);
CREATE INDEX IF NOT EXISTS idx_quantity_logs_date ON quantity_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_isessions_style ON inspection_sessions(product_style_id);
CREATE INDEX IF NOT EXISTS idx_isessions_lot ON inspection_sessions(order_lot_id);
CREATE INDEX IF NOT EXISTS idx_isessions_factory ON inspection_sessions(factory_id);
CREATE INDEX IF NOT EXISTS idx_isessions_date ON inspection_sessions(inspection_date);
CREATE INDEX IF NOT EXISTS idx_isessions_status ON inspection_sessions(status);
CREATE INDEX IF NOT EXISTS idx_ilines_session ON inspection_lines(session_id);
CREATE INDEX IF NOT EXISTS idx_idefect_line ON inspection_defect_records(line_id);
CREATE INDEX IF NOT EXISTS idx_debit_notes_customer ON debit_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_debit_items_note ON debit_note_items(debit_note_id);
CREATE INDEX IF NOT EXISTS idx_debit_items_lot ON debit_note_items(order_lot_id);
CREATE INDEX IF NOT EXISTS idx_import_staging_job ON import_staging_rows(job_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_catalog ON defect_catalog_items(catalog_id);
CREATE INDEX IF NOT EXISTS idx_price_rules_customer ON price_rules(customer_id);
CREATE INDEX IF NOT EXISTS idx_ufp_user ON user_factory_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_ufp_factory ON user_factory_permissions(factory_id);
