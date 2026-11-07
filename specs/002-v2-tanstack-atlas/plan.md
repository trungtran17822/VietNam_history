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
5. **Docs**: cập nhật ngay trong cùng nhánh mọi tài liệu bị ảnh hưởng bởi thay đổi của session: `docs/spec/SPEC.md` + `SPEC.vi.md` (đã làm / chưa làm), `docs/srs/SRS.md` (khi yêu cầu đổi), `docs/architecture/SYSTEM_DESIGN.md`, `docs/devops/DEPLOY.md`, `CLAUDE.md`, `README.md`, `frontend/README.md`, `backend/README.md`, và mục liên quan của tài liệu này. Không để docs lệch khỏi code khi kết thúc session.
6. Commit trên nhánh riêng. Không push lên `Staging`/`main`, không deploy.

## 3. Chia session (chạy tuần tự)

Do giới hạn dung lượng đĩa, các session chạy **lần lượt** trong cùng một checkout (không dùng worktree). Mỗi nhánh cắt từ nhánh của session trước, nên session sau dùng thẳng code của session trước.

| Thứ tự | Session | Nhánh (cắt từ) | Trọng tâm |
|---|---|---|---|
| 1 | **S1 Nền tảng + giao diện** | `Dat/feature/v2-frontend` (từ `Dat/feature/core`) | stack mới, port toàn bộ tính năng, thiết kế lại, form biến số & hệ số, zod schema, file `ngoc-hoi-ha-hoi-1789.json`, tooling/CI |
| 2 | **S2 Nội dung bài giảng + mô phỏng** | `Dat/feature/v2-lessons` (từ `v2-frontend`) | 5 file bài trong `frontend/src/content/lessons/`, test nội dung, `frontend/data/sources.json` |
| 3 | **S3 Atlas Việt Nam 3D** | `Dat/feature/v2-atlas` (từ `v2-lessons`) | dữ liệu atlas, renderer, route `#/atlas`, liên kết bài giảng ↔ địa danh |
| 4 | **S4 QA/QC + Staging** | `Dat/feature/v2-release` (từ `v2-atlas`) | kiểm thử toàn hệ thống, sửa lỗi, rà docs lần cuối, merge vào `Staging` để CI deploy preview |

**Thực tế đã chạy:** S3 chạy **song song** với S1 (Đạt cho phép, đĩa đủ cho thêm một worktree), trong worktree riêng, nhánh `Dat/feature/v2-atlas` cắt từ `Dat/feature/core` (không có code S1/S2). S3 chỉ chạm các đường dẫn atlas; S4 gộp `v2-frontend`, `v2-lessons` và `v2-atlas` (xung đột chắc chắn duy nhất: `frontend/src/routes/atlas.tsx`, lấy bản S3). Chi tiết ở `notes/s3.md`.

Session sau không được viết lại phần của session trước trừ khi để sửa lỗi; mọi thay đổi như vậy ghi vào notes của mình.
Mỗi session ghi nhật ký riêng ở `specs/002-v2-tanstack-atlas/notes/<s1|s2|s3|s4>.md`.
Không commit `.claude/settings.json` (đang có thay đổi cục bộ của Đạt) và `venv/`.

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
- **Đã chốt ở S3** (chi tiết `notes/s3.md`, nguồn và giấy phép ở `frontend/src/content/atlas/SOURCES.md`):
  - `provinces.topo.json` có hai object: `provinces` (thêm `label: [lat, lng]`, điểm đặt tên nằm trên đất liền) và `archipelagos` (`{ id, name, provinceId, label, islands: [{ qid, name, coords }] }`). Vùng hai quần đảo cũng nằm trong hình học của tỉnh chủ quản. `type` là trạng thái hiện hành: Đồng Nai, Quảng Ninh, Bắc Ninh đã lên thành phố (2026), nên có 25 tỉnh + 9 thành phố.
  - `landmarks.json` thêm `tags?` (loại phụ, ví dụ kinh đô cũng là di sản UNESCO), `aliases?` (tên gọi khác cho tìm kiếm), `coordsFrom?` (`osm:<type>/<id>` khi không dùng toạ độ Wikidata), `coordsNote?`, `qid`, `illustrative: true`. Có 9 di sản UNESCO (kể cả Yên Tử – Vĩnh Nghiêm – Côn Sơn, Kiếp Bạc, 2025).
  - Id tỉnh, quần đảo và địa danh cùng một không gian, không trùng nhau (có test), nên `?place=` và `onSelect` nhận bất kỳ loại nào. **Không đổi id đã phát hành**: bài giảng tham chiếu qua `atlasPlaceIds`.
  - Liên kết hai chiều: thẻ địa danh lấy bài từ `lessonIds` của địa danh và từ `atlasPlaceIds` của bài. Id bài Mông - Nguyên là `khang-chien-mong-nguyen-vuon-khong` (id thật ở S1).
  - API: `onSelect(id | null)` (null = bấm ra biển), `focusPlace(null)` về toàn quốc, thêm `setViewInsets({ bottom, reserved })` cho bottom sheet trên phone, `ready` (Promise khi địa hình đã tải). `elevation` là `frontend/public/atlas/terrain.png` (R độ cao, G độ sâu, B bóng địa hình).
  - URL: `#/atlas?place=<id>&kind=<loại,…>&q=<chữ>` (`kind` cách nhau bằng dấu phẩy, `q` tối đa 80 ký tự).

## 5. Ngân sách tối ưu và khả năng mở rộng

- Thêm một bài giảng = thêm một file JSON (nạp bằng `import.meta.glob`, lazy theo route), không sửa code.
- Thêm một địa danh = thêm một dòng `landmarks.json`.
- three.js và Atlas tách chunk riêng, chỉ tải khi vào route cần 3D. JS ban đầu (không tính chunk 3D) ≤ 200 KB gzip.
- Renderer: `InstancedMesh`, một renderer cho mỗi view, `destroy()` khi unmount, mức chất lượng thấp cho máy yếu. Mục tiêu ≥ 30 FPS trên phone giả lập, ≥ 55 FPS desktop.
- Tìm kiếm Atlas: bỏ dấu tiếng Việt khi so khớp, chấm điểm kiểu GeoGnos (§4.1 báo cáo) + Levenshtein ≤ 2.
- Trạng thái chọn đưa lên URL (`#/atlas?place=<id>&kind=...`) để chia sẻ link.

## 6. Ngoài phạm vi v2

Tài khoản thật, CMS phía server, analytics, đa ngôn ngữ, nội dung đã được chuyên gia duyệt.
