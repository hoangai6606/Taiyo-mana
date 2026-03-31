# Fix: Danh sách Phiếu Kiểm Hàng Trống (Multi-Tenant Workspace Filtering)

## Vấn đề

Sau khi tạo phiếu kiểm hàng thành công, danh sách vẫn hiện "Chưa có phiếu kiểm hàng nào" dù dữ liệu đã lưu vào database.

## Nguyên nhân

Có 2 lỗi chính:

### 1. GET handler dùng 2 query (COUNT rồi SELECT) — dễ bị lệch kết quả

```
Luồng cũ:
  Bước 1: SELECT COUNT(*) WHERE workspace_id = '...'   → trả về 0 (lệch)
  Bước 2: Vì count = 0, bỏ qua SELECT dữ liệu thật      → trả về []
```

Code cũ chạy 2 query riêng biệt:
- Query 1: Raw SQL `COUNT(*)` qua Neon tagged template
- Query 2: Drizzle ORM `SELECT` nếu COUNT > 0

Vấn đề: Hai cách gọi (raw SQL vs Drizzle ORM) xử lý tham số khác nhau, đặc biệt sau khi migrate uuid→text. COUNT có thể trả về 0 do sai kiểu tham số, khiến SELECT không bao giờ chạy.

**Cách fix:** Bỏ hẳn COUNT, chạy một query Drizzle duy nhất. Nếu lỗi (Neon driver bug trên bảng rỗng), catch và trả về `[]` thay vì lỗi 500.

### 2. Lấy tên khách hàng từ JOIN sai cột

```
Code cũ:
  .select({ customerName: customers.name })        // ← từ bảng customers (JOIN)
  .leftJoin(customers, eq(inspectionRecords.customerId, customers.id))
```

Form tạo phiếu lưu `customer_name` (text trực tiếp), KHÔNG lưu `customer_id` (UUID). nên:
- `customer_id` = null → LEFT JOIN không match → `customers.name` = null
- Dữ liệu thật nằm ở `inspection_records.customer_name`

**Cách fix:** Select trực tiếp `inspectionRecords.customerName` thay vì JOIN.

### 3. Đăng ký mới — JWT thiếu workspaceId

```typescript
// Code cũ — quên truyền workspaceId:
const token = generateToken({ userId: user.id, role: user.role });

// Code fix:
const token = generateToken({
  userId: bufferToUUID(user.id),
  role: user.role,
  workspaceId: user.workspaceId ? bufferToUUID(user.workspaceId) : undefined,
});
```

Người dùng đăng ký mới nhận JWT không có `workspaceId` → `getWorkspaceId(req)` trả về `undefined` (không phải `null`) → handler trả về `[]` vì rơi vào nhánh "không có workspace".

## Tổng hợp các thay đổi

| File | Thay đổi |
|------|----------|
| `server/routes/inspection-records.ts` | Bỏ COUNT query, dùng 1 Drizzle query duyệt; select `customerName` trực tiếp từ `inspection_records`; thêm workspace validation cho GET/PUT/DELETE `/:id` |
| `server/auth/routes.ts` | Fix đăng ký: thêm `workspaceId` vào JWT, convert UUID đúng cách |

### 4. Xem chi tiết phiếu kiểm hàng — màn hình trắng

```
Luồng lỗi:
  Click eye icon → handleDetail() → fetch(`/api/inspection-records/${id}`) — KHÔNG có Authorization header
  → Backend authenticateToken trả 401
  → response.ok = false → selectedRecord vẫn null
  → setView('detail') vẫn chạy → render condition: view === 'detail' && selectedRecord → false
  → Không render gì → màn hình trắng
```

Code cũ dùng `fetch()` thường, không gắn Bearer token:

```typescript
// Code cũ:
const response = await fetch(`/api/inspection-records/${record.id}`);
if (response.ok) {
  const fullRecord = await response.json();
  setSelectedRecord(fullRecord);
}
setView('detail'); // ← vẫn chạy dù fetch thất bại
```

**Cách fix:** Dùng `api.inspectionRecords.getById()` từ `src/lib/api.ts` (tự gắn Authorization header). Chỉ chuyển sang view detail khi thành công, hiện alert khi thất bại.

```typescript
// Code fix:
const fullRecord = await api.inspectionRecords.getById(record.id);
setSelectedRecord(fullRecord);
setView('detail');
```

| File | Thay đổi |
|------|----------|
| `src/pages/inspection/InspectionPage.tsx` | Import `api`, thay `fetch()` bằng `api.inspectionRecords.getById()`, chỉ set view khi thành công |

## Sau khi fix

- Workspace user: chỉ thấy phiếu của workspace mình
- Super admin (workspaceId = null): thấy tất cả phiếu
- User mới đăng ký: JWT có workspaceId → thấy đúng dữ liệu
- Truy cập/sửa/xóa phiếu workspace khác → 403 Forbidden
