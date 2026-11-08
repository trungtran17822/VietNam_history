# Sử Việt: Mô phỏng Lịch sử 3D

Ứng dụng lớp học mô phỏng lịch sử Việt Nam trên sa bàn 3D tương tác: 6 bài giảng đi đủ 6 bước (bài thí điểm Trận Ngọc Hồi - Hạ Hồi 1789, Rạch Gầm - Xoài Mút, Chi Lăng - Xương Giang, Mông - Nguyên, Điện Biên Phủ, Chiến dịch Hồ Chí Minh) và Atlas Việt Nam 3D (34 tỉnh, thành phố, Hoàng Sa, Trường Sa, 71 địa danh) liên kết với bài giảng. Nội dung minh họa, chưa được chuyên gia duyệt. Bản đồ © OpenStreetMap contributors (ODbL).

| Thư mục | Nội dung |
| --- | --- |
| [frontend/](frontend/) | Ứng dụng web (Vite + React + TypeScript, TanStack Router, Tailwind, three.js), build ra `frontend/dist` và triển khai lên Vercel. Xem [frontend/README.md](frontend/README.md). |
| [backend/](backend/) | Máy chủ phiên lớp học (Cloudflare Worker + D1), không bắt buộc. Xem [backend/README.md](backend/README.md). |
| [specs/](specs/) | Đặc tả (Spec Kit): `001-classroom-sim-demo` (bản đầu, API contract) và `002-v2-tanstack-atlas` (kế hoạch v2, nhật ký từng session trong `notes/`). |
| [PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md) | Người dùng, giọng điệu và hệ thiết kế "The Lacquered Lesson Plan". |
| [docs/](docs/) | PRD, SPEC, [SRS](docs/srs/SRS.md), [thiết kế hệ thống](docs/architecture/SYSTEM_DESIGN.md), [đánh giá UI](docs/design/UI_REVIEW.md), [hướng dẫn triển khai](docs/devops/DEPLOY.md). |
| [tests/](tests/) | E2E (Playwright, desktop và điện thoại), `tests/atlas/` (dữ liệu atlas, `node:test`). Unit test nằm cạnh code: `frontend/src/lib/*.test.ts` (Vitest), `backend/test/` (`node:test`). |
| [.github/workflows/](.github/workflows/) | CI/CD (Node 24): kiểm tra + unit + atlas + build + ngân sách gói JS + E2E mỗi lần push; `Staging` → bản thử, `main` → production (Vercel + Cloudflare). |

Chạy trên máy (Node 20.19+, CI dùng Node 24; lần đầu `npm ci`):

```bash
npm run dev:frontend   # Vite, http://localhost:8080
npm run dev:backend    # máy chủ lớp học, cổng 8787 (không bắt buộc)
```

Kiểm thử (lần đầu: `npx playwright install chromium`):

```bash
npm test
```

Đăng nhập demo: `admin` / `123` cho cả giáo viên và học sinh.
