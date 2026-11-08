# Sử Việt: Mô phỏng Lịch sử 3D

Ứng dụng lớp học mô phỏng lịch sử và địa lí trên nền tảng tương tác. Nội dung minh họa, chưa được chuyên gia duyệt.

| Thư mục | Nội dung |
| --- | --- |
| [frontend/](frontend/) | Ứng dụng web tĩnh (HTML/CSS/JS thuần, three.js), triển khai lên Vercel. Xem [frontend/README.md](frontend/README.md). |
| [backend/](backend/) | Máy chủ phiên lớp học (Cloudflare Worker + D1), không bắt buộc. Xem [backend/README.md](backend/README.md). |
| [specs/001-classroom-sim-demo/](specs/001-classroom-sim-demo/) | Đặc tả (Spec Kit): spec, plan, data model, API contract, tasks. |
| [docs/](docs/) | PRD, SPEC, [SRS](docs/srs/SRS.md), [thiết kế hệ thống](docs/architecture/SYSTEM_DESIGN.md), [đánh giá UI](docs/design/UI_REVIEW.md), [hướng dẫn triển khai](docs/devops/DEPLOY.md). |
| [tests/](tests/) | Unit test (`node:test`) và E2E (Playwright). |
| [.github/workflows/](.github/workflows/) | CI/CD: kiểm tra + unit + E2E mỗi lần push; `Staging` → bản thử, `main` → production (Vercel + Cloudflare). |

Chạy trên máy:

```bash
npm run dev:frontend   # http://localhost:8080
npm run dev:backend    # máy chủ lớp học, cổng 8787 (không bắt buộc)
```

Kiểm thử (lần đầu: `npm ci && npx playwright install chromium`):

```bash
npm test
```

Đăng nhập demo: `admin` / `123` cho cả giáo viên và học sinh.
