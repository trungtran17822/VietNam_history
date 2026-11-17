<p align="center">
  <img src="frontend/public/assets/logo/logo-transparent.png" alt="Logo Sử Việt" width="140">
</p>

<h1 align="center">Sử Việt: Mô phỏng Lịch sử 3D</h1>

<p align="center">
  Sa bàn 3D tương tác để dạy lịch sử Việt Nam trên máy chiếu lớp học.<br>
  <strong>Bản thử nghiệm (POC)</strong> · Giao diện tiếng Việt
</p>

<p align="center">
  <a href="https://github.com/trungtran17822/VietNam_history/actions/workflows/ci-cd.yml"><img alt="CI" src="https://github.com/trungtran17822/VietNam_history/actions/workflows/ci-cd.yml/badge.svg"></a>
  <img alt="Node" src="https://img.shields.io/badge/node-%3E%3D%2020.19-339933?logo=nodedotjs&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/vite-8-646CFF?logo=vite&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=black">
  <img alt="TypeScript" src="https://img.shields.io/badge/typescript-strict-3178C6?logo=typescript&logoColor=white">
</p>

> **Nội dung minh họa, chưa được chuyên gia duyệt.** Mọi con số, sơ đồ và trang phục trong mô phỏng là giả định sư phạm, không phải kết luận của sách giáo khoa.

---

## Demo

| | Địa chỉ |
| --- | --- |
| Ứng dụng (Vercel) | https://vietnam-history-eight.vercel.app |

Đăng nhập demo: `admin` / `123` cho cả vai trò giáo viên và học sinh. Đây là tài khoản thử, không bảo vệ dữ liệu.

---

## Tính năng

- **Vòng lặp 6 bước** cho mỗi bài giảng: Khởi động → Khám phá (diễn biến gốc) → Câu hỏi của nhân vật lịch sử → Học sinh thử cách khác → So sánh số liệu → Giải thích và củng cố.
- **Sa bàn tranh lụa 2.5D** dựng bằng three.js: bốn góc camera, dòng thời gian, đội hình và mũi tên diễn biến.
- **Atlas Việt Nam 3D**: 34 đơn vị hành chính từ 01/07/2025, Hoàng Sa, Trường Sa và 71 địa danh, liên kết hai chiều với bài giảng.
- **10 bài học** đi kèm:
  - 6 bài chạy đủ 6 bước với sa bàn 3D: Ngọc Hồi - Hạ Hồi (1789, bài thí điểm), Rạch Gầm - Xoài Mút (1785), Chi Lăng - Xương Giang (1427), Kháng chiến chống Mông - Nguyên, Điện Biên Phủ (1954), Chiến dịch Hồ Chí Minh (1975).
  - 4 bài theo SGK (Bài 1–4, trích trong `history_data/`) dạng trục thời gian: Nước Nga và Liên Xô, Châu Âu và nước Mỹ, Châu Á (1918–1945), Chiến tranh thế giới thứ hai.
- **Phiên lớp học** (tùy chọn): giáo viên mở mã 6 ký tự, học sinh nhập mã trên điện thoại để gửi lựa chọn; giáo viên xem tỉ lệ phương án và tải CSV ẩn danh. Bài học vẫn chạy khi không có máy chủ.
- **Trình soạn bài** cho giáo viên: nội dung, câu hỏi, biến số và hệ số, cảnh 3D, hoàn tác/làm lại, kiểm tra dữ liệu trước khi lưu, nhập/xuất JSON.

---

## Kiến trúc

```
frontend/  Vite + React 19 + TypeScript (strict), TanStack Router (hash), Tailwind v4, zod
           ├─ lesson JSON (src/content/lessons/)  ── nội dung bài học, kiểm tra bằng schema
           ├─ scene/ (three.js) + features/atlas/ ── sa bàn và atlas, nạp lười (lazy chunk)
           └─ lib/ (thuần TypeScript, có unit test) ── engine mô phỏng, lưu trữ, thời gian
backend/   Cloudflare Worker + D1 (SQLite); Node dev server dùng bộ nhớ tạm
tests/     Playwright E2E (desktop 1280×720 và điện thoại 360×800), atlas data (node:test)
scripts/   check.sh (kiểm tra tĩnh), bundle-budget.mjs, dựng dữ liệu atlas
```

Quyết định kỹ thuật chính:

- **Bài học là dữ liệu.** Thay đổi nội dung hay hệ số mô phỏng không cần sửa mã; `engine.ts` chỉ đọc hệ số từ JSON.
- **Ngân sách gói JS**: JS khởi đầu ≤ 200 KB gzip; three.js và atlas chỉ tải khi mở sa bàn.
- **Lưu trữ phía trình duyệt**: giáo viên sửa bài trong `localStorage`; học sinh chỉ thấy bài có trạng thái *Đã dạy* và ngày không muộn hơn hôm nay.
- **Phiên lớp học không lưu tên hay IP**; dữ liệu ẩn danh tự xoá sau 180 ngày.

Chi tiết: [PRODUCT.md](PRODUCT.md) (người dùng, nguyên tắc), [DESIGN.md](DESIGN.md) (token và quy tắc thiết kế), [docs/architecture/SYSTEM_DESIGN.md](docs/architecture/SYSTEM_DESIGN.md).

---

## Bắt đầu nhanh

**Yêu cầu:** Node.js ≥ 20.19 (CI dùng Node 24).

```bash
npm ci
npm run dev:frontend   # http://localhost:8080
npm run dev:backend    # API phiên lớp học, cổng 8787 (không bắt buộc)
```

Lệnh thường dùng:

| Lệnh | Việc làm |
| --- | --- |
| `npm run check` | Kiểm tra tĩnh: TypeScript strict, schema mọi bài học, nhãn bắt buộc, NFC, cú pháp backend, đối chiếu trích dẫn SGK |
| `npm run test:unit` | Vitest (engine, lưu trữ, hợp đồng bài học) và `node:test` của backend |
| `npm run atlas:test` | Dữ liệu atlas: 34 đơn vị, quần đảo, địa danh đúng tỉnh, tìm kiếm, liên kết bài học ↔ địa điểm |
| `npm run build` | Build ra `frontend/dist`; `npm run preview` phục vụ bản build ở cổng 8080 |
| `npm run budget` | Kiểm tra ngân sách gói JS sau khi build |
| `npm test` | Tất cả: check + unit + atlas + E2E |

Chạy E2E lần đầu: `npx playwright install chromium`. Bộ E2E tự build, chạy bản xem thử và API; bộ phiên lớp học chậm vì render WebGL bằng phần mềm.

---

## Triển khai

- Đẩy lên nhánh `<tên>/feature/<chủ-đề>` → merge vào `Staging` (bản thử trên Vercel) → merge vào `main` (production).
- CI (`.github/workflows/ci-cd.yml`) chạy kiểm tra, unit, atlas, build, ngân sách và E2E ở mỗi lần push. Hai job triển khai chỉ chạy khi có secret `VERCEL_TOKEN` và `CLOUDFLARE_API_TOKEN`; thiếu secret thì job bỏ qua, không báo lỗi.
- Triển khai thủ công: `npm run deploy` (cần đăng nhập Vercel CLI và Wrangler). Hướng dẫn đầy đủ và cách khôi phục bản trước: [docs/devops/DEPLOY.md](docs/devops/DEPLOY.md).

---

## Tài liệu

| Tài liệu | Nội dung |
| --- | --- |
| [frontend/README.md](frontend/README.md) | Ứng dụng web, luồng 6 bước, trình soạn bài |
| [backend/README.md](backend/README.md) | API phiên lớp học và hợp đồng HTTP |
| [docs/spec/SPEC.md](docs/spec/SPEC.md) · [SPEC.vi.md](docs/spec/SPEC.vi.md) | Đặc tả: yêu cầu, hiện trạng, các điểm chưa rõ |
| [docs/srs/SRS.md](docs/srs/SRS.md) | Đặc tả yêu cầu phần mềm (tiếng Việt) |
| [specs/](specs/) | Spec Kit: bản v1 (`001-classroom-sim-demo`) và kế hoạch v2 (`002-v2-tanstack-atlas`) |
| [docs/](docs/) | PRD, thiết kế hệ thống, đánh giá UI, tài liệu nghiên cứu |

---

## Trạng thái POC và giới hạn đã biết

Bản này dùng để thử nghiệm trên lớp học, chưa phải sản phẩm hoàn chỉnh.

- **Chưa có chuyên gia duyệt.** Nội dung và trích dẫn Ngọc Hồi - Hạ Hồi chưa đối chiếu với nguồn; các bài khác đã có trích dẫn nhưng chưa được thẩm định.
- **Hệ số mô phỏng là giả định.** Mọi số liệu gốc và chênh lệch là giá trị minh họa, ghi trong phần `assumptions` của từng phương án.
- **Đăng nhập demo không bảo mật.** Tài khoản cứng trong `frontend/src/lib/auth.ts`.
- **Chưa chọn giấy phép.** Repo chưa có tệp `LICENSE`.
- **Dữ liệu bản đồ**: ranh giới là phái sinh của OpenStreetMap (ODbL), nên atlas phải giữ dòng "© OpenStreetMap contributors". Nguồn và giấy phép: [frontend/src/content/atlas/SOURCES.md](frontend/src/content/atlas/SOURCES.md).

---

## Đóng góp

Đọc [CLAUDE.md](CLAUDE.md) trước khi sửa mã: quy ước dự án, nhãn nội dung bắt buộc và các bẫy đã biết. Khi đổi hành vi, cập nhật tài liệu liên quan trong cùng một thay đổi (`docs/spec/SPEC.md`, `SPEC.vi.md`, và `docs/srs/SRS.md` nếu đổi yêu cầu).
