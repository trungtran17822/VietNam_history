# backend: máy chủ phiên lớp học

API nhỏ cho phiên lớp học (F10) và dữ liệu thử nghiệm ẩn danh (F11). Chạy trên Cloudflare Workers với D1 (SQLite). Bài học không cần máy chủ này: nếu không kết nối được, giáo viên thấy thông báo và mọi giai đoạn vẫn chạy.

Hợp đồng HTTP: [specs/001-classroom-sim-demo/contracts/api.md](../specs/001-classroom-sim-demo/contracts/api.md). Mô hình dữ liệu: [data-model.md](../specs/001-classroom-sim-demo/data-model.md).

| Tệp | Vai trò |
| --- | --- |
| `src/handlers.js` | `handle(request, ctx)`: định tuyến, kiểm tra dữ liệu, CORS, CSV, dọn dữ liệu hết hạn. Chạy được cả trên Workers và Node |
| `src/store.js` | `D1Store` (production) và `MemoryStore` (dev, test), cùng một giao diện |
| `src/index.js` | Điểm vào Worker: `fetch` và `scheduled` (cron 03:00 UTC xoá dữ liệu quá 180 ngày) |
| `dev-server.js` | Máy chủ Node dùng `MemoryStore`, cho chạy trên máy và cho E2E |
| `migrations/0001_init.sql` | Bảng `sessions`, `answers` |
| `migrations/0002_session_version.sql` | Cột `sessions.version` và trigger tăng nó mỗi khi có bài gửi (cho ETag/304) |
| `scripts/smoke.mjs` | Kiểm thử nhanh một API đang chạy (wrangler dev hoặc Worker thật): gửi dồn 70 máy cùng lúc, giới hạn 60, 304, CSV, xoá |
| `wrangler.toml` | Cấu hình Worker, môi trường `staging` / `production`, liên kết D1 |
| `test/handlers.test.js` | Unit test cho API (`node:test`, không cần phụ thuộc) |

## Chạy trên máy

Không cần cài gói nào (Node ≥ 18):

```bash
node backend/dev-server.js 8787
```

Dữ liệu nằm trong bộ nhớ và mất khi tắt. Frontend trên `localhost` tự gọi `http://localhost:8787` (`frontend/js/config.js`).

## Kiểm thử

```bash
node --test backend/test/
node backend/scripts/smoke.mjs https://sv-class-api.suviet.workers.dev https://vietnam-history-eight.vercel.app
```

Smoke test tạo một phiên thật rồi xoá nó khi xong.

## Chịu tải khi đông người dùng

- Worker không giữ trạng thái và chạy ở máy chủ Cloudflare gần người dùng nhất, nên không cần tăng cấu hình máy.
- Học sinh gửi bài: 2 truy vấn (đọc phiên, rồi một câu `INSERT … ON CONFLICT` vừa ghi vừa kiểm tra giới hạn 60 máy). Nhiều máy gửi cùng lúc cũng không vượt giới hạn.
- Giáo viên xem tổng hợp: cứ 4 giây hỏi một lần, tạm dừng khi tab bị ẩn. Nếu `sessions.version` không đổi, máy chủ trả `304` mà chỉ đọc một dòng.
- Gói miễn phí đủ cho khoảng 100 tiết học mỗi ngày. Lên gói trả phí thì không cần sửa code. Chi tiết: [SYSTEM_DESIGN.md §7](../docs/architecture/SYSTEM_DESIGN.md).

## Quy tắc chính

- Mã phiên 6 ký tự (bỏ `0 O 1 I L`), hết hạn sau 12 giờ; tối đa 60 bài mỗi phiên; thân request ≤ 4 KB.
- Khoá giáo viên 32 ký tự hex chỉ trả về một lần khi mở phiên; máy chủ chỉ lưu SHA-256 của nó.
- Học sinh ẩn danh: mỗi máy có một `clientId` ngẫu nhiên; gửi lại thì thay bài cũ. Không lưu tên, email hay IP; log của Worker tắt (`observability.enabled = false`).
- CSV dùng mã ẩn danh A01, A02…, có BOM cho Excel và chặn công thức (`=`, `+`, `-`, `@`).

## Triển khai

Đang chạy:
- production: https://sv-class-api.suviet.workers.dev
- staging: https://sv-class-api-staging.suviet.workers.dev

Cách deploy lại, CI và cách khôi phục bản cũ: [docs/devops/DEPLOY.md](../docs/devops/DEPLOY.md).
