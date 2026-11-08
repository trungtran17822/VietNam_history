# Sử Việt: ứng dụng web (v2)

Ứng dụng lớp học mô phỏng trận Ngọc Hồi - Hạ Hồi (mùa xuân 1789) trên sa bàn tranh lụa 2.5D. Giáo viên
chiếu bài lên máy chiếu, cả lớp xem diễn biến gốc, chọn cách đánh khác, xem mô phỏng lại và so sánh số
liệu. Nội dung minh họa, chưa được chuyên gia duyệt; nhãn này nằm ở dải trên cùng và chân mọi trang.

Vite + React 19 + TypeScript (strict), TanStack Router (định tuyến theo file, hash history), TanStack
Query (chỉ cho API phiên lớp), Tailwind CSS v4, zod, three.js từ npm. Hệ thiết kế: [`DESIGN.md`](../DESIGN.md)
và [`PRODUCT.md`](../PRODUCT.md) ở gốc repo.

## Chạy

Cần Node 20.19 trở lên (CI dùng Node 24; trên máy Đạt `node` mặc định là v18, nên chạy trước
`export PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH`). Từ thư mục gốc repo:

```bash
npm ci
npm run dev:frontend   # Vite, http://localhost:8080
npm run dev:backend    # máy chủ phiên lớp, cổng 8787 (không bắt buộc)
npm run build          # frontend/dist (bản Vercel phục vụ)
npm run preview        # phục vụ frontend/dist
npm run budget         # sau build: JS ban đầu ≤ 200 KB gzip, three.js và atlas chỉ nằm trong chunk tải lười
```

Đăng nhập demo: `admin` / `123` cho cả giáo viên và học sinh. Trang kiểm tra glyph tiếng Việt:
`#/fonttest` (không cần đăng nhập).

## Atlas Việt Nam (`#/atlas?place=<id>&kind=<loại,…>&q=<chữ>`)

Bản đồ 3D 34 tỉnh, thành phố (từ 01/7/2025), Hoàng Sa (thuộc TP Đà Nẵng), Trường Sa (thuộc tỉnh Khánh
Hòa) và 71 địa danh (chiến trường, kinh đô, di sản UNESCO, di tích, danh thắng). Vào từ thanh điều hướng
hoặc thẻ "Atlas Việt Nam" trên bảng giáo viên và bảng học sinh.

- Tìm không cần dấu ("ha hoi" ra "Đồn Hạ Hồi"), chịu gõ sai nhẹ; lọc theo loại; mũi tên lên/xuống + Enter.
- Trạng thái nằm trên URL nên gửi link là mở lại đúng chỗ.
- Liên kết hai chiều với bài giảng: thẻ địa danh (và thẻ tỉnh) có nút "Mở bài giảng" cho mọi bài nêu địa
  danh đó trong `atlasPlaceIds` hoặc nằm trong `lessonIds` của địa danh (học sinh chỉ thấy bài đã phát
  hành); trang bài học có dòng "Trên Atlas Việt Nam" dẫn ngược lại. `npm run atlas:test` báo lỗi nếu một
  `atlasPlaceIds` không trỏ tới địa danh, tỉnh hay quần đảo có thật.
- Trên điện thoại, bảng tìm kiếm là tấm kéo từ dưới lên; camera canh giữa phần bản đồ còn thấy.
- Ranh giới lấy từ OpenStreetMap (ODbL), nên dòng "© OpenStreetMap contributors" luôn hiện trên bản đồ.
  Nguồn, giấy phép và cách tạo lại dữ liệu: [`src/content/atlas/SOURCES.md`](src/content/atlas/SOURCES.md)
  (`npm run atlas:build`; harness vẽ thử: `npm run atlas:harness`, `npm run atlas:shoot`).

## Luồng 6 bước (`#/lesson/<id>/interactive`)

1. **Khởi động** (5'): bối cảnh, câu hỏi trọng tâm, nút bắt đầu.
2. **Khám phá sa bàn gốc** (10'): sa bàn diễn biến gốc, phát/dừng/tua, 4 góc camera, các giai đoạn. Khi
   khung sa bàn hẹp (điện thoại), 4 nút góc camera nằm thành một hàng dưới sa bàn thay vì che lên trên.
3. **Câu hỏi của nhân vật** (8'): nhân vật lịch sử đặt câu hỏi; học sinh chọn một phương án cho mỗi
   biến số. Phương án gốc mang nhãn `question.originalLabel` (mặc định "Cách gốc trong lịch sử"). Bảng
   bên cạnh: giáo viên mở phiên lớp và xem tỉ lệ lựa chọn; học sinh nhập mã để gửi (không bắt buộc).
4. **Thử cách khác** (7'): sa bàn chạy lại, kèm danh sách lựa chọn của em.
5. **So sánh** (8'): cảnh báo mô phỏng bắt buộc đứng đầu, rồi hai cột số liệu (thời gian, tổn thất,
   điểm thế trận) và nút xem giả định, cách tính.
6. **Củng cố** (7'): lời nhận xét theo từng lựa chọn, khảo sát ẩn danh (nếu đã vào lớp), thử phương án
   khác hoặc kết thúc.

Bài chưa có biến số thì bước 3 nói rõ "Bài học này chưa có phần thử cách khác." và khóa bước 4-6.

## Soạn bài (`#/lesson/<id>/edit`, giáo viên)

Năm thẻ: **Nội dung** (thông tin bài, các giai đoạn và nguồn), **Câu hỏi**, **Biến số & hệ số**,
**Sa bàn 3D**, **Ghi chú**. Hoàn tác/làm lại cho mọi thay đổi (nút hoặc Ctrl+Z / Ctrl+Shift+Z ngoài ô
nhập). Bài chỉ lưu được khi qua kiểm tra zod (`lib/lesson-schema.ts`); lỗi hiện thành danh sách tiếng Việt.

Thẻ **Biến số & hệ số**:

- Số liệu gốc (thời gian, tổn thất, điểm thế trận), nhân vật đặt câu hỏi, nhãn cho cách gốc.
- Thêm, sửa, xóa, đổi thứ tự biến số; mỗi biến có ít nhất 2 phương án và đúng một phương án gốc (hệ số
  của phương án gốc luôn là 0).
- Mỗi phương án: tên, tên ngắn, mã, mô tả, 3 hệ số (giờ, tổn thất, điểm), giả định, lời nhận xét ở bước 6.
- Ô **Thử nhanh** tính kết quả ngay và cho biết khoảng kết quả trên mọi tổ hợp.

Thẻ **Sa bàn 3D**: tên và màu hai phe, quân số, các lớp hiện trên sa bàn, kiểu địa hình, nhãn địa danh
(tọa độ x -120..120, z -93..93), mốc camera. Xem trước trực tiếp.

Bài mới tạo từ "Bài giảng trống" hoặc "Tạo bài từ tư liệu" đi được đủ 6 bước ngay khi có một biến số.

## Kiến trúc

| Thư mục | Nội dung |
| --- | --- |
| `src/routes/` | Một file cho mỗi route (TanStack Router). `__root.tsx` là khung trang: dải nhãn, header, chân trang, màn chuyển cảnh sau đăng nhập. `routeTree.gen.ts` do plugin Vite sinh ra, không sửa tay. |
| `src/components/` | Màn hình: `LessonPage` (trang bài học, xem trước), `StageLoop` (6 bước), `Editor` + `VariablesEditor` (soạn bài), `Player` (sa bàn + điều khiển), `ClassPanel` (phiên lớp, khảo sát), `ui.tsx` (icon SVG, modal, `PROTOTYPE_NOTICE`, `SIMULATION_NOTICE`). |
| `src/lib/` | Logic không có UI, có test Vitest (`domain.test.ts`): `lesson-schema` (zod), `engine` (tính toán xác định), `storage` (localStorage, luật hiển thị, nhập/xuất), `class-session` (API lớp), `auth`, `audio`, `text` (NFC), `intake`, `prefs`, `guards`, `transition`. |
| `src/features/atlas/` | Atlas: `scene.ts` (`VietnamAtlasScene`, three.js), `search.ts` (tìm bỏ dấu, chấm điểm, mã hóa URL; không có DOM), `AtlasView.tsx` (bảng tìm, thẻ địa danh, ghi công OSM). Route `src/routes/atlas.tsx`, chunk riêng tải lười. |
| `src/content/atlas/` | `provinces.topo.json` (34 đơn vị + 2 quần đảo), `landmarks.json` (71 địa danh), `SOURCES.md`. Id không bao giờ đổi vì bài giảng tham chiếu qua `atlasPlaceIds`. |
| `src/content/lessons/` | Mỗi bài một file JSON, nạp lười. Cả 6 bài (bài thí điểm và 5 bài) đều chạy đủ 6 giai đoạn: Ngọc Hồi, Rạch Gầm, Chi Lăng, Mông – Nguyên, Điện Biên Phủ, Chiến dịch Hồ Chí Minh. Trích dẫn chưa đọc được nguyên văn để trống, kèm ghi chú "Cần bổ sung trích dẫn nguyên văn". |
| `src/scene/` | `silk-map.ts` (lớp `SilkMapScene`, chỉ file này import three, nạp lười), `artwork.ts` (vẽ bản đồ, họa tiết, ảnh thu nhỏ bằng canvas), `counts.ts`, `sprites/` (PNG thay họa tiết). |
| `public/` | Phông Noto (woff2), logo và `atlas/terrain.png` (địa hình), phục vụ nguyên trạng. |
| `data/sources.json` | Danh mục nguồn (chưa được code nạp, chưa có chuyên gia duyệt): SGK Lịch sử và Địa lí 9 (Bài 1, 16, 18), Việt Nam sử lược, một mục Wikipedia làm đầu mối. |

Mọi thứ riêng của từng bài nằm trong JSON: biến số, hệ số, giả định, nhận xét, nhân vật, và
`simulation.scene` (địa hình, đặc điểm, nhãn, mũi tiến quân, đội hình, đơn vị đặc biệt). Muốn đổi kết quả
mô phỏng thì sửa hệ số trong bài, không sửa `engine.ts`.

Bài mẫu được nạp vào `localStorage` (khóa `history_sim_lessons_db_v2`). Khi sửa file JSON của bài mẫu,
tăng `revision` của bài đó để trình duyệt đã có dữ liệu cũ nhận bản mới.

Địa chỉ API lớp: biến build `VITE_API_BASE` nếu có; nếu không thì `http://localhost:8787` khi chạy trên
`localhost`, và `DEPLOYED_API_BASE` trong `src/lib/class-session.ts` khi đã triển khai (để trống thì tắt
tính năng lớp học, bài học vẫn chạy).

## Họa tiết sa bàn

Họa tiết mặc định vẽ bằng canvas. Có thể thay từng họa tiết bằng PNG nền trong suốt trong
`src/scene/sprites/`; tên tệp và kích thước nằm trong [src/scene/sprites/README.md](src/scene/sprites/README.md).
Không vẽ chữ tiếng Việt trong canvas; nhãn địa danh là lớp HTML.

## Kiểm tra

```bash
npm run check       # tsc, schema mọi bài, nhãn bắt buộc, NFC, cú pháp backend
npm run test:unit   # Vitest (domain) + node:test (backend)
npm run atlas:test  # node:test cho dữ liệu atlas, tìm kiếm và liên kết bài ↔ địa danh
npm run test:e2e    # Playwright, 1280×720 và 360×800 (có tests/e2e/atlas.spec.js)
```
