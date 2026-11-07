# 002 - Sử Việt v2: TanStack + Tailwind, bài giảng mới, Atlas Việt Nam 3D

Ngày lập: 2026-11-07 · Người chốt: Đạt · Trạng thái: đang thực hiện

Tài liệu này là nguồn sự thật chung cho mọi session v2. Session nào đổi một hợp đồng ở §4 thì
sửa đúng mục đó trong cùng commit và ghi lý do vào `notes/<session>.md`.

## 1. Quyết định đã chốt

| Chủ đề | Quyết định |
|---|---|
| Frontend | React 19 + TypeScript + Vite + **TanStack Router** (file-based, **hash history** để giữ link `#/...` cũ, không cần rewrite trên Vercel) + **TanStack Query** (chỉ cho API lớp học: poll + ETag 304) + **Tailwind v4** + zod. Build ra file tĩnh `frontend/dist`, deploy Vercel như cũ. Không SSR. |
| Backend | Giữ nguyên `backend/` (Cloudflare Worker + D1). Chỉ đổi nếu hợp đồng API buộc phải đổi. |
| Thiết kế | Skill **impeccable**: tạo `PRODUCT.md` + `DESIGN.md` (tokens), refine bản sắc "tranh lụa" hiện có, đẹp hơn và dễ dùng hơn (desktop 1280×720, phone 360×800, a11y WCAG AA). |
| Kỷ luật code | Skill **ponytail**: ít phụ thuộc nhất, ít file nhất, không trừu tượng hóa "để sau". Ghi `// ponytail:` cho mọi chỗ cố ý đơn giản hóa có giới hạn. |
| Bài giảng | Cả hai nhóm: hoàn thiện 3 bài có sẵn (Rạch Gầm - Xoài Mút 1785, Chi Lăng - Xương Giang 1427, Kháng chiến chống Mông - Nguyên) + 2 bài mới theo SGK Lịch sử và Địa lí 9 (`docs/sources/`): Điện Biên Phủ 1954, Chiến dịch Hồ Chí Minh 1975. |
| Atlas 3D | Bản đồ Việt Nam 3D theo **34 tỉnh/thành từ 01/7/2025**, địa hình nổi, có **Hoàng Sa và Trường Sa**, địa danh lịch sử + danh lam thắng cảnh có thẻ thông tin, liên kết sang bài giảng. |
| Deploy | Merge vào `Staging` → CI deploy preview → Đạt duyệt → mới merge `main` (production). Không session nào tự deploy production. |
| Tham khảo | `geognos-reverse-engineering-report.md` (ngoài repo) chỉ để học mẫu tương tác: tìm kiếm mờ, lọc, deep-link bằng URL, thẻ địa danh, slideshow. **Không** chép nội dung, ảnh, sprite của GeoGnos (§14 báo cáo). Không analytics bên thứ ba, không nhúng vị trí người dùng. |

## 2. Quy trình bắt buộc cho mỗi session

1. **Plan**: đọc tài liệu này, `CLAUDE.md`, `.claude/rules/*`, viết kế hoạch ngắn vào `notes/<session>.md`.
2. **Implement**.
3. **Verify → Fix → Verify**, tối đa **3 vòng**. Ở điểm có nhiều cách làm (renderer, nguồn dữ liệu, bố cục), thử tối đa 2-3 phương án, đo bằng số (kích thước bundle, FPS, thời gian tải, ảnh chụp Playwright) và **chọn phương án tốt nhất**, ghi bảng so sánh vào notes.
4. **QA + QC**: `npm run check`, unit, E2E (desktop + phone), soát nhãn nội dung, soát ảnh chụp.
5. Commit trên nhánh riêng, mở PR vào `Staging`. Không deploy.

## 3. Chia session

| Session | Nhánh | Sở hữu (chỉ sửa những đường dẫn này) | Phụ thuộc |
|---|---|---|---|
| **S1 Nền tảng + giao diện** | `Dat/feature/v2-frontend` | toàn bộ `frontend/` **trừ** `frontend/src/features/atlas/**`, `frontend/src/content/atlas/**`, `frontend/src/routes/atlas*`, và các file bài giảng của S2; `package.json`, `vite`/`tsconfig`, `scripts/check.sh`, `tests/`, `.github/workflows/`, `vercel.json`; file bài `frontend/src/content/lessons/ngoc-hoi-ha-hoi-1789.json` | không |
| **S2 Nội dung bài giảng + mô phỏng** | `Dat/feature/v2-lessons` | `frontend/src/content/lessons/*.json` trừ Ngọc Hồi; `tests/content/**` | hợp đồng §4.1 |
| **S3 Atlas Việt Nam 3D** | `Dat/feature/v2-atlas` | `frontend/src/features/atlas/**`, `frontend/src/content/atlas/**`, `frontend/src/routes/atlas*`, `frontend/public/atlas/**`, `scripts/atlas/**` | hợp đồng §4.2; phần mount vào app chờ S1 |
| **S4 Tích hợp + QA/QC + Staging** | `Dat/feature/v2-integration` | merge S1-S3, sửa lỗi tích hợp, docs (`docs/spec/SPEC*.md`, `docs/srs/SRS.md`, `CLAUDE.md`, READMEs) | S1, S2, S3 xong |

`package.json` gốc là file chung: S2/S3 chỉ được **thêm** dependency tối thiểu, xung đột giải quyết ở S4.
Mỗi session ghi nhật ký riêng ở `specs/002-v2-tanstack-atlas/notes/<s1|s2|s3|s4>.md` (không sửa notes của session khác).

## 4. Hợp đồng dữ liệu

### 4.1 Lesson v2 (`frontend/src/content/lessons/<id>.json`, một file một bài)

- Giữ nguyên toàn bộ shape hiện tại của `SEED_LESSONS` trong `frontend/js/lesson-data.js` (sections + `source`, `questions`, `keyNotes`, ghi chú riêng giáo viên, `question.character`, `question.variables[].options[]` với `isOriginal`, `timeDelta`, `casualtyDelta`, `positionScoreDelta`, `assumptions`, `baseline`, `simulation.propsConfig|unitCounts|factionColors|cameraPresets|keyframes`, `status`, `date`, `disclaimer`, `simulationDisclaimer`).
- Thêm:
  ```jsonc
  {
    "schemaVersion": 2,
    "era": "1789",                      // năm hoặc khoảng, để sắp xếp
    "atlasPlaceIds": ["ngoc-hoi"],      // liên kết sang landmark ở §4.2
    "factions": {
      "a": { "name": "Quân Tây Sơn", "color": "#962d22" },
      "b": { "name": "Quân Thanh",   "color": "#1e3a8a" }
    },
    "simulation": {
      "scene": {
        "terrain": "plain",             // plain | river | mountain-pass | basin | coast-river | urban
        "labels":   [{ "text": "Đồn Ngọc Hồi", "at": [0, -27] }],           // toạ độ mặt bàn x,z trong [-100,100]
        "features": [{ "type": "river", "points": [[-90,-55],[90,-40]] },   // river | hill | fort | village | forest | road | marsh | airfield
                     { "type": "fort",  "at": [15, 2], "faction": "b" }],
        "routes":   [{ "faction": "a", "points": [[-80,60],[0,0]], "from": 0.0, "to": 0.6 }]
      }
    }
  }
  ```
- `unitCounts` cũ (`taySonInfantry`, `qingInfantry`...) được renderer chấp nhận như alias của `aInfantry`, `aSpecial`, `bInfantry`, `bArtillery`. Bài mới dùng tên mới.
- Bài phải chạy đủ 6 bước: tối thiểu 3 biến, mỗi biến 3 phương án, đúng 1 `isOriginal` có delta 0.
- **Nguồn**: mọi `source.quote` phải là trích dẫn thật lấy từ tài liệu mà session thực sự đọc được (PDF SGK trong repo, hoặc trang web công khai đã mở được). Không đọc được nguyên văn thì để `quote: ""` và `note: "Cần bổ sung trích dẫn nguyên văn"`. Mọi con số mô phỏng là minh họa và ghi rõ. Giữ nhãn "Nội dung minh họa, chưa được chuyên gia duyệt".
- Bảng màu phe: không dùng biểu tượng/cờ mang tính kỳ thị hay quân phiệt làm trang trí.
- S1 là chủ của zod schema cuối cùng. Nếu phải lệch khỏi mục này, S1 sửa mục này và ghi vào `notes/s1.md`.

### 4.2 Atlas (`frontend/src/content/atlas/`)

- `provinces.topo.json`: 34 đơn vị cấp tỉnh (2025), đã giản lược (mục tiêu ≤ 400 KB gzip toàn bộ dữ liệu ranh giới), thuộc tính `{ id, name, type: "tinh"|"thanh-pho", region }`. Có Hoàng Sa (thuộc TP Đà Nẵng) và Trường Sa (thuộc tỉnh Khánh Hòa).
- `landmarks.json`: `[{ id, name, kind: "di-tich" | "danh-thang" | "unesco" | "chien-truong" | "kinh-do", provinceId, coords: [lat, lng], era?, summary, lessonIds?: [], sources: [{ title, url, license }] }]`. Mô tả do session tự viết bằng tiếng Việt, không chép nguyên văn; toạ độ ưu tiên Wikidata (CC0).
- `elevation`: ảnh heightmap/texture trong `frontend/public/atlas/` từ nguồn public domain hoặc giấy phép mở (SRTM/GEBCO...).
- `SOURCES.md` trong thư mục atlas: liệt kê từng nguồn dữ liệu + giấy phép + cách tái tạo (`scripts/atlas/`).
- API renderer: `new VietnamAtlasScene(container, { quality, onSelect })` với `setQuality`, `focusPlace(id)`, `setFilter({ kinds, query })`, `destroy()`. Nhãn là HTML overlay, không vẽ chữ trong canvas (giống quy tắc `scene-map`).

## 5. Ngân sách tối ưu và khả năng mở rộng

- Thêm một bài giảng = thêm một file JSON (nạp bằng `import.meta.glob`, lazy theo route), không sửa code.
- Thêm một địa danh = thêm một dòng `landmarks.json`.
- three.js và Atlas tách chunk riêng, chỉ tải khi vào route cần 3D. JS ban đầu (không tính chunk 3D) ≤ 200 KB gzip.
- Renderer: `InstancedMesh`, một renderer cho mỗi view, `destroy()` khi unmount, mức chất lượng thấp cho máy yếu. Mục tiêu ≥ 30 FPS trên phone giả lập, ≥ 55 FPS desktop.
- Tìm kiếm Atlas: bỏ dấu tiếng Việt khi so khớp, chấm điểm kiểu GeoGnos (§4.1 báo cáo) + Levenshtein ≤ 2.
- Trạng thái chọn đưa lên URL (`#/atlas?place=<id>&kind=...`) để chia sẻ link.

## 6. Ngoài phạm vi v2

Tài khoản thật, CMS phía server, analytics, đa ngôn ngữ, nội dung đã được chuyên gia duyệt.
