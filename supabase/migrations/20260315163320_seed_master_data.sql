/*
  # Seed Master Data

  ## Summary
  Inserts initial master data for the system including:
  - Product types: SHOES and APPAREL
  - Default customers: FITFIT, Gardner
  - Default factories: T&K, TAN PHUOC AN
  - Defect type lists: 15 for shoes, 16 for apparel (based on actual inspection sheets)
*/

-- Product types
INSERT INTO product_types (code, name, name_jp) VALUES
  ('SHOES', 'Giày / Footwear', 'シューズ'),
  ('APPAREL', 'May mặc / Apparel', 'アパレル')
ON CONFLICT (code) DO NOTHING;

-- Customers
INSERT INTO customers (code, name, name_jp) VALUES
  ('FITFIT', 'FITFIT', 'フィットフィット'),
  ('GARDNER', 'Gardner', 'ガードナー')
ON CONFLICT (code) DO NOTHING;

-- Factories
INSERT INTO factories (code, name, name_jp) VALUES
  ('TK', 'T&K', 'T&K'),
  ('TPA', 'TAN PHUOC AN', 'タンフォックアン')
ON CONFLICT (code) DO NOTHING;

-- Defect types for SHOES (15 types)
INSERT INTO defect_types (product_type_id, code, name_vn, name_jp, sort_order)
SELECT pt.id, d.code, d.name_vn, d.name_jp, d.sort_order
FROM product_types pt, (VALUES
  ('S01', 'Bẩn mặt trong', '内側汚れ', 1),
  ('S02', 'Bẩn mặt ngoài', '外側汚れ', 2),
  ('S03', 'Keo tràn', '接着剤はみ出し', 3),
  ('S04', 'Keo thiếu', '接着剤不足', 4),
  ('S05', 'Nhăn mũi giày', 'つま先シワ', 5),
  ('S06', 'Nhăn thân giày', 'アッパーシワ', 6),
  ('S07', 'Hở miệng giày', '口ゴム浮き', 7),
  ('S08', 'Đường may lỗi', '縫製不良', 8),
  ('S09', 'Lệch Size', 'サイズ違い', 9),
  ('S10', 'Đế bong', '底剥がれ', 10),
  ('S11', 'Đế lỗi', '底不良', 11),
  ('S12', 'Màu loang', '色ムラ', 12),
  ('S13', 'Lỗi phụ liệu', '副材料不良', 13),
  ('S14', 'Sai màu', '色違い', 14),
  ('S15', 'Lỗi khác', 'その他不良', 15)
) AS d(code, name_vn, name_jp, sort_order)
WHERE pt.code = 'SHOES'
ON CONFLICT (product_type_id, code) DO NOTHING;

-- Defect types for APPAREL (16 types)
INSERT INTO defect_types (product_type_id, code, name_vn, name_jp, sort_order)
SELECT pt.id, d.code, d.name_vn, d.name_jp, d.sort_order
FROM product_types pt, (VALUES
  ('A01', 'Bẩn', '汚れ', 1),
  ('A02', 'Lỗi vải', '生地不良', 2),
  ('A03', 'Đường may lỗi', '縫製不良', 3),
  ('A04', 'Sai màu', '色違い', 4),
  ('A05', 'Màu loang', '色ムラ', 5),
  ('A06', 'Lỗi in', 'プリント不良', 6),
  ('A07', 'Lỗi thêu', '刺繍不良', 7),
  ('A08', 'Sai size', 'サイズ違い', 8),
  ('A09', 'Chỉ thừa', '余り糸', 9),
  ('A10', 'Lỗi kéo khóa', 'ジッパー不良', 10),
  ('A11', 'Lỗi khuy nút', 'ボタン不良', 11),
  ('A12', 'Lỗi nhãn', 'ラベル不良', 12),
  ('A13', 'Vải bị rách', '生地破れ', 13),
  ('A14', 'Lỗi đường viền', 'ヘム不良', 14),
  ('A15', 'Lỗi túi', 'ポケット不良', 15),
  ('A16', 'Lỗi khác', 'その他不良', 16)
) AS d(code, name_vn, name_jp, sort_order)
WHERE pt.code = 'APPAREL'
ON CONFLICT (product_type_id, code) DO NOTHING;
