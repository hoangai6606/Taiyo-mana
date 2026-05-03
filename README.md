Taiyo-mana

## Nhật ký triển khai

### 2026-04-02: Thêm chức năng Tái Kiểm (Reinspection)

#### 1. Database & Schema
- **Migration mới**: `supabase/migrations/20260402000000_add_reinspection_columns.sql`
  - Thêm 6 cột vào bảng `inspection_items`: `reinspect_quantity`, `reinspect_passed`, `reinspect_failed`, `reinspect_specifications`, `reinspect_accessories`, `reinspect_appearance`
- **Drizzle schema** (`drizzle/schema.ts`): thêm 6 cột tương ứng
- **TypeScript types** (`src/lib/database.types.ts`): thêm type cho `InspectionItem`

#### 2. API Backend
- **Routes** (`server/routes/inspection-records.ts`):
  - `POST /` và `PUT /:id` đã lưu thêm 6 field tái kiểm khi tạo/cập nhật phiếu

#### 3. Import Excel
- **InspectionForm** (`src/pages/inspection/InspectionForm.tsx`):
  - Hỗ trợ format Excel mới (`taiyonewform.xlsx`) có cột KIỂM HÀNG + TÁI KIỂM trên cùng dòng
  - Auto-detect format mới qua header "TÁI KIỂM"
  - Map cột tái kiểm: SL TK, Đạt TK, Hư TK, TS lỗi TK, PL lỗi TK, NQ lỗi TK

#### 4. Trang chi tiết phiếu
- **InspectionDetail** (`src/pages/inspection/InspectionDetail.tsx`):
  - Header bảng A đổi từ 1 hàng đơn thành 2 hàng (rowSpan/colSpan), chia nhóm KIỂM HÀNG (xanh) và TÁI KIỂM (cam)
  - Bỏ cột "Kiểm kim", thay bằng 6 cột TÁI KIỂM

#### 5. Báo cáo xuất Excel
- **ReportPreviewModal** (`src/pages/inspection/ReportPreviewModal.tsx`):
  - Thêm cột TÁI KIỂM vào bảng xem trước báo cáo (header cam)
  - Hỗ trợ chỉnh sửa số lượng tái kiểm (Đạt TK, Hư TK) và text (TS lỗi TK, PL lỗi TK, NQ lỗi TK)
  - Hàng Tổng cộng bao gồm các cột tái kiểm
- **Export** (`src/lib/export-inspection-report.ts`):
  - Xuất thêm các cột tái kiểm ra file Excel
