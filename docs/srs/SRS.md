# Đặc tả Yêu cầu Phần mềm (SRS)
## Sử Việt: Mô phỏng bài học lịch sử 3D, bản demo "Trận Ngọc Hồi - Hạ Hồi (1789)"

| | |
|---|---|
| Phiên bản | 1.2, 08/11/2026 (thêm SRS-A-10: liên kết hai chiều bài giảng ↔ Atlas; cập nhật cách kiểm thử mục 6). 1.1, 07/11/2026: form soạn biến số & hệ số, frontend v2 |
| Trạng thái | Sẵn sàng triển khai (spec đã qua 3 vòng review) |
| Chuẩn tham chiếu | Cấu trúc theo ISO/IEC/IEEE 29148 (kế thừa IEEE 830) |
| Nguồn | PRD `docs/prd/PRD và lộ trình demo Mô phỏng lịch sử 3D.docx` (cập nhật 01/11/2026); spec `specs/001-classroom-sim-demo/`; thiết kế hệ thống `docs/architecture/SYSTEM_DESIGN.md`; báo cáo nghiên cứu `docs/research/` |
| Chủ sở hữu | PM: Trung. Kỹ thuật: Đạt |

---

## 1. Giới thiệu

### 1.1 Mục đích
Tài liệu mô tả đầy đủ, kiểm chứng được, các yêu cầu của bản demo Sử Việt để đội phát triển, giáo
viên hợp tác và cố vấn sử học cùng hiểu một cách. Mỗi yêu cầu có mã, độ ưu tiên và cách kiểm thử.

### 1.2 Phạm vi sản phẩm
Ứng dụng web tiếng Việt biến bài "Trận Ngọc Hồi - Hạ Hồi" thành sa bàn 2.5D/3D. Cuối bài, vua Quang
Trung hỏi học sinh nếu là các em thì sẽ làm khác ở điểm nào; học sinh chọn phương án trong danh sách,
hệ thống mô phỏng, so sánh số liệu với cách gốc (ghi rõ là mô phỏng) và nhân vật giải thích bằng
giọng khuyến khích. Giáo viên có thể mở **phiên lớp** để xem phân bố lựa chọn của cả lớp và xuất dữ
liệu thử nghiệm ẩn danh.

**Không thuộc phạm vi**: các bài khác; học sinh nhập ý tưởng tự do; hỏi đáp tự do với nhân vật AI
(F9, hoãn theo mốc T7); VR; ứng dụng di động riêng; tài khoản người dùng thật; thanh toán.

### 1.3 Định nghĩa và viết tắt

| Thuật ngữ | Nghĩa |
|---|---|
| Sa bàn | Cảnh bản đồ tranh lụa 2.5D dựng bằng three.js |
| Biến số / phương án | Một điểm học sinh được đổi (ví dụ hướng tiến công) và các lựa chọn của nó |
| Hệ số | Mức cộng/trừ vào thời gian, tổn thất, điểm thế trận mà mỗi phương án khai báo trong dữ liệu bài |
| Phiên lớp | Một buổi học có mã 6 ký tự để thiết bị học sinh gửi lựa chọn ẩn danh |
| Khoá giáo viên | Chuỗi bí mật chỉ thiết bị mở phiên giữ, dùng để xem/xuất/xoá dữ liệu phiên |
| Câu trả lời ẩn danh | Bản ghi lựa chọn, thời gian, đánh giá của một thiết bị trong một phiên, không gắn danh tính |
| P0 / P1 | Bắt buộc trong demo / nên có nếu kịp (theo PRD) |

### 1.4 Tài liệu tham chiếu
PRD; `docs/spec/SPEC.md` (hiện trạng so với yêu cầu); `specs/001-classroom-sim-demo/` (spec, plan,
data model, API contract, tasks); `docs/architecture/SYSTEM_DESIGN.md`; `.specify/memory/constitution.md`.

---

## 2. Mô tả tổng quát

### 2.1 Bối cảnh sản phẩm
Hai phần tách thư mục:
- **Frontend** (`frontend/`): trang web tĩnh build bằng Vite (React, TypeScript, three.js), chứa toàn bộ nội dung bài và
  tính toán mô phỏng; chạy được cả khi không có mạng tới máy chủ lớp học. Triển khai trên Vercel.
- **Backend** (`backend/`): một Cloudflare Worker và cơ sở dữ liệu D1, chỉ lưu phiên lớp và câu trả
  lời ẩn danh. Triển khai trên Cloudflare.

### 2.2 Chức năng chính
1. Trình chiếu diễn biến gốc có lời dẫn, chú thích và nguồn (F1-F3).
2. Vòng 6 màn: Khởi động → Khám phá 3D gốc → Câu hỏi của vua → Thử cách khác → So sánh → Giải thích (F4-F8).
3. Phiên lớp: giáo viên xem phân bố lựa chọn của cả lớp (F10).
4. Dữ liệu thử nghiệm ẩn danh: thời gian dùng, khảo sát 3 câu, xuất CSV (F11).
5. Soạn bài nháp từ tư liệu có nguồn, chặn phát hành khi chưa đối chiếu nguồn (bản cập nhật UI của Trung).
6. Soạn biến số và hệ số mô phỏng ngay trong trình soạn bài, để bài mới chạy được đủ 6 màn (v2).

### 2.3 Người dùng

| Nhóm | Đặc điểm | Dùng chức năng |
|---|---|---|
| Giáo viên sử | Chiếu trên máy chiếu lớp; một tiết 45 phút | 1, 2, 3, 4, 5 |
| Học sinh (THCS/THPT, vị thành niên) | Dùng chung màn chiếu hoặc điện thoại/máy tính riêng | 1, 2, gửi lựa chọn và khảo sát |
| Cố vấn sử học | Duyệt nội dung và hệ số; không phải người dùng cuối | Đọc dữ liệu bài, danh sách giả định |
| Nhà trường | Cần sản phẩm tin cậy, chạy trên thiết bị sẵn có | Không thao tác trực tiếp |

### 2.4 Môi trường vận hành
Trình duyệt Chromium (Chrome, Edge, Cốc Cốc), Firefox, Safari bản hiện hành; máy tính cấu hình thấp
của trường; máy chiếu 1280×720; điện thoại rộng từ 360 px. Phiên lớp cần Internet; bài học thì không.

### 2.5 Ràng buộc
- Giao diện và lời nhân vật 100% tiếng Việt, chuẩn hoá NFC; không vẽ chữ vào canvas/3D.
- Gói JS ban đầu ≤ 200 KB gzip (không tính chunk sa bàn 3D, nạp lười); ít thư viện phụ thuộc. (v1 không có bước build; từ v2 dùng Vite + React + TypeScript để có kiểu dữ liệu, test cạnh code và kiểm tra lược đồ bài học.)
- Không thu thập thông tin cá nhân của học sinh.
- Hạ tầng gói miễn phí (Vercel Hobby, Cloudflare Workers/D1 Free) cho giai đoạn demo.

### 2.6 Giả định và phụ thuộc
- Nội dung còn là minh hoạ cho tới khi cố vấn duyệt kho dữ liệu (mốc T4); nhãn cảnh báo luôn hiện.
- Đăng nhập demo (`admin`/`123`) chỉ để thử luồng, không phải bảo mật.
- Các giá trị mặc định đã chọn (phiên 12 giờ, tối đa 60 câu trả lời, lưu 180 ngày, 3 câu khảo sát) cần PM xác nhận ở bước 1 của lộ trình; đổi chúng chỉ đổi hằng số.
- Chủ repo cấu hình secrets triển khai (Vercel, Cloudflare).

---

## 3. Yêu cầu cụ thể

### 3.1 Yêu cầu chức năng

Cột "PRD" ánh xạ về mã yêu cầu trong PRD; "Spec" ánh xạ về `specs/001-classroom-sim-demo/spec.md`.

#### 3.1.1 Trình chiếu diễn biến gốc

| Mã | Yêu cầu | Ưu tiên | PRD | Spec | Kiểm thử |
|---|---|---|---|---|---|
| SRS-F-01 | Hệ thống phát diễn biến gốc trên sa bàn theo 4 chương và mốc thời gian của dữ liệu bài | P0 | F1 | FR-001 | E2E lesson-flow |
| SRS-F-02 | Người dùng phát, tạm dừng, về đầu, tua tới điểm bất kỳ, đổi 4 góc camera bất cứ lúc nào; phản hồi trong ≤1 giây | P0 | F2 | FR-002 | E2E lesson-flow |
| SRS-F-03 | Mỗi chương có lời dẫn, nhãn thời gian và nút "Xem nguồn" hiển thị sách, chương, trích dẫn, ghi chú | P0 | F3 | FR-003 | E2E lesson-flow |

#### 3.1.2 Câu hỏi, mô phỏng, so sánh, giải thích

| Mã | Yêu cầu | Ưu tiên | PRD | Spec | Kiểm thử |
|---|---|---|---|---|---|
| SRS-F-04 | Nhân vật vua Quang Trung đặt 1-2 câu hỏi cuối bài, gồm câu "nếu là các con… sẽ làm khác ở điểm nào?" | P0 | F4 | FR-004 | E2E |
| SRS-F-05 | Học sinh chọn 1 phương án cho mỗi biến số (3-5 biến số, mỗi biến ≥2 phương án); phương án lịch sử được chọn sẵn và đánh dấu "Cách của nghĩa quân Tây Sơn"; không có ô nhập chữ tự do | P0 | F5 | FR-005 | E2E |
| SRS-F-06 | Cùng lựa chọn luôn cho cùng kết quả; mọi con số tính từ hệ số trong dữ liệu bài | P0 | F6 | FR-006 | Unit: 81 tổ hợp × 2 lần |
| SRS-F-07 | Màn so sánh hiện thời gian, tổn thất ước tính, điểm thế trận của cách gốc và cách của em; khung cảnh báo mô phỏng là phần tử đầu tiên và được cuộn vào tầm nhìn; nút "Xem giả định" liệt kê mọi hệ số áp dụng | P0 | F7 | FR-007 | E2E |
| SRS-F-08 | Lời giải thích nêu điều kiện lịch sử cho từng biến số, kết bằng lời mời suy nghĩ tiếp, có nút "Thử phương án khác" giữ lựa chọn trước; không dùng từ chấm đúng sai (danh sách ở SRS-Q-03) | P0 | F8 | FR-008 | Unit: quét từ ngữ |
| SRS-F-09 | Bài chưa có biến số hiển thị "Bài học này chưa có phần thử cách khác" và không cho sang màn 4-6 | P0 | – | Edge case | E2E |

#### 3.1.3 Phiên lớp (F10)

| Mã | Yêu cầu | Ưu tiên | PRD | Spec | Kiểm thử |
|---|---|---|---|---|---|
| SRS-F-10 | Giáo viên mở phiên lớp ở màn 3 và thấy mã 6 ký tự (bảng chữ `ABCDEFGHJKMNPQRSTUVWXYZ23456789`), chữ lớn, số câu trả lời | P1 | F10 | FR-009 | Unit + E2E |
| SRS-F-11 | Học sinh nhập mã, hệ thống kiểm tra mã đúng bài đang mở; khi bấm "Chạy mô phỏng", lựa chọn được gửi và báo "Đã gửi lựa chọn tới lớp"; gửi lại thì thay câu trả lời cũ | P1 | F10 | FR-010 | Unit + E2E |
| SRS-F-12 | Bảng giáo viên hiện số câu trả lời và số học sinh chọn từng phương án của từng biến số, cập nhật ≤5 giây | P1 | F10 | FR-011 | E2E |
| SRS-F-13 | Chỉ thiết bị giữ khoá giáo viên được xem phân bố, xuất, xoá phiên; mã phiên chỉ cho phép gửi | P1 | F10 | FR-012 | Unit |
| SRS-F-14 | Phiên nhận câu trả lời trong 12 giờ, tối đa 60 câu trả lời; quá hạn/đầy trả về thông báo tiếng Việt và bài học của học sinh vẫn chạy | P1 | F10 | FR-013 | Unit |
| SRS-F-15 | Tải lại trang giáo viên trong lúc phiên còn hạn thì khôi phục phiên trên cùng thiết bị | P1 | F10 | Edge case | E2E |

#### 3.1.4 Dữ liệu thử nghiệm ẩn danh (F11)

| Mã | Yêu cầu | Ưu tiên | PRD | Spec | Kiểm thử |
|---|---|---|---|---|---|
| SRS-F-16 | Thiết bị đã vào phiên thấy khảo sát 3 câu (1-5, có thể bỏ trống) ở màn 6: mức thú vị, mức hình dung diễn biến, muốn học tiếp cách này | P1 | F11 | FR-014 | E2E |
| SRS-F-17 | Ghi thời gian dùng (giây, từ khi mở màn 1 tới lần gửi gần nhất, tối đa 7.200) kèm câu trả lời | P1 | F11 | FR-014 | Unit |
| SRS-F-18 | Giáo viên tải CSV UTF-8 có BOM, mỗi thiết bị một dòng, mã ẩn danh A01, A02…; không có cột định danh; chống chèn công thức | P1 | F11 | FR-015 | Unit + E2E |
| SRS-F-19 | Giáo viên xoá phiên (xoá cả câu trả lời); hệ thống tự xoá phiên quá 180 ngày | P1 | F11 | FR-016 | Unit |

#### 3.1.5 Soạn bài: tư liệu có nguồn, biến số và hệ số

| Mã | Yêu cầu | Ưu tiên | PRD | Spec | Kiểm thử |
|---|---|---|---|---|---|
| SRS-F-20 | Giáo viên tạo bài nháp từ nội dung + nguồn (tên, cơ quan/tác giả, liên kết HTTPS, năm, thông tin cần đối chiếu); thiếu trường bắt buộc thì báo lỗi rõ | P1 | NFR độ đúng | FR-021 | E2E |
| SRS-F-21 | Không phát hành được bài nháp khi giáo viên chưa xác nhận "Tôi đã đối chiếu nguồn" | P1 | NFR độ đúng | FR-021 | E2E |
| SRS-F-24 | Thẻ "Biến số & hệ số" trong trình soạn bài: sửa số liệu gốc (thời gian, tổn thất, điểm thế trận), nhân vật đặt câu hỏi và nhãn cách gốc; thêm, sửa, xoá, đổi thứ tự biến số và phương án; mỗi phương án có 3 hệ số, giả định và lời nhận xét màn 6 | P1 | F5, F6 | v2 plan | E2E (`authoring.spec.js`) |
| SRS-F-25 | Mỗi biến số có ≥2 phương án và đúng 1 phương án gốc với hệ số bằng 0; bài vi phạm lược đồ (zod) thì không lưu được và lỗi được liệt kê bằng tiếng Việt | P1 | F6 | v2 plan | Unit + E2E |
| SRS-F-26 | Mọi thay đổi trong trình soạn bài hoàn tác/làm lại được; bài mới có ít nhất một biến số chạy được đủ 6 màn với kết quả tính từ hệ số giáo viên nhập | P1 | F5-F8 | v2 plan | E2E (`authoring.spec.js`) |

#### 3.1.6 Vai trò và hiển thị

| Mã | Yêu cầu | Ưu tiên | Spec |
|---|---|---|---|
| SRS-F-22 | Chế độ học sinh không hiện ghi chú riêng của giáo viên và không hiện bài chưa phát hành (trạng thái khác "Đã dạy" hoặc ngày trong tương lai) | P0 | FR-020 |
| SRS-F-23 | Chỉ vai trò giáo viên thấy nút mở phiên, xuất và xoá; học sinh không có cách nào xem câu trả lời của bạn khác | P1 | FR-009, US3-6 |

### 3.2 Giao diện ngoài

#### 3.2.1 Giao diện người dùng
- Nhận diện "Sử Việt" (tên + logo con dấu); hệ thiết kế "The Lacquered Lesson Plan" trong `DESIGN.md`, token màu trong `frontend/src/styles.css`.
- Dải "Nội dung minh họa, chưa được chuyên gia duyệt" dưới header và chân trang bài học luôn hiện.
- Màn 3 hai cột trên màn rộng (câu hỏi + biến số | bảng phiên lớp), một cột trên điện thoại.
- Nút cao ≥44 px, chữ thân ≥16 px; tương phản chữ ≥4.5:1; có trạng thái focus khi dùng bàn phím.
- Không cuộn ngang ở bề rộng 360 px.

#### 3.2.2 Giao diện phần mềm (API)
REST/JSON qua HTTPS, chi tiết ở `specs/001-classroom-sim-demo/contracts/api.md`:
`GET /api/health`, `POST /api/sessions`, `GET /api/sessions/:code`,
`PUT /api/sessions/:code/answers/:clientId`, `GET /api/sessions/:code/summary`,
`GET /api/sessions/:code/export.csv`, `DELETE /api/sessions/:code`. Lỗi trả `{error, message}` với
thông báo tiếng Việt.

#### 3.2.3 Giao diện truyền thông
HTTPS; CORS chỉ cho các origin trong `ALLOWED_ORIGINS`; header `X-Teacher-Key` cho thao tác giáo viên.

### 3.3 Yêu cầu chất lượng (phi chức năng)

| Mã | Thuộc tính | Yêu cầu đo được |
|---|---|---|
| SRS-Q-01 | Độ đúng nội dung | Mọi sự kiện hiển thị có nguồn; nhãn "Nội dung minh họa, chưa được chuyên gia duyệt" và khung cảnh báo mô phỏng không thể bị dữ liệu bài ẩn đi |
| SRS-Q-02 | Giải thích được | 100% con số so sánh truy ngược được về hệ số trong "Xem giả định" |
| SRS-Q-03 | Giọng khuyến khích | 0 lần xuất hiện các từ "sai", "sai lầm", "thất bại", "kém", "tệ", "dở", "ngu" trong lời giải thích và tóm tắt kết quả, trên cả 81 tổ hợp |
| SRS-Q-04 | Hiệu năng | Màn đầu dùng được ≤3 giây trên mạng trường; giáo viên từ đăng nhập tới sa bàn đang chạy ≤60 giây; giáo viên thấy câu trả lời mới ≤5 giây với 40 thiết bị |
| SRS-Q-05 | Khả dụng khi mất kết nối | Tắt máy chủ lớp học: cả 6 màn chạy hết, 0 lỗi chặn, có thông báo rõ |
| SRS-Q-06 | Riêng tư | Không lưu tên, email, IP, user agent, văn bản tự do; mã ẩn danh mới cho mỗi phiên; log request của Worker tắt; lưu tối đa 180 ngày |
| SRS-Q-07 | Bảo mật | Khoá giáo viên 128 bit, chỉ lưu SHA-256; thân request ≤4 KB; chỉ nhận id `[A-Za-z0-9_-]` và số nguyên; CSV chống chèn công thức |
| SRS-Q-08 | Tương thích | Chạy trên máy chiếu 1280×720 và điện thoại 360 px; không cuộn ngang |
| SRS-Q-09 | Tiếng Việt | Toàn bộ chữ giao diện có dấu đầy đủ, chuẩn NFC |
| SRS-Q-10 | Tái sử dụng | Engine, cảnh và hệ thống nhân vật tách khỏi dữ liệu từng bài; thêm bài mới chỉ cần dữ liệu |
| SRS-Q-11 | Bảo trì | Mỗi push chạy kiểm tra tĩnh, unit test và E2E; tài liệu spec/SRS cập nhật cùng thay đổi hành vi |

### 3.4 Yêu cầu dữ liệu
- Trên trình duyệt: bài học, tiến độ, lượt chạy gần nhất, trạng thái phiên của thiết bị (localStorage).
- Trên máy chủ: `sessions(code, lesson_id, teacher_key_hash, created_at, expires_at)` và
  `answers(session_code, client_id, choices, duration_sec, rating_interest, rating_visualize, rating_again, updated_at)`.
  Chi tiết và quy tắc kiểm tra: `specs/001-classroom-sim-demo/data-model.md`.

### 3.5 Yêu cầu triển khai
- Frontend: Vercel, nhánh `Staging` → Preview, `main` → Production.
- Backend: Cloudflare Workers, môi trường `staging` và `production`, mỗi môi trường một D1 riêng.
- CI GitHub Actions: kiểm tra trước khi deploy; job deploy thiếu secrets thì bỏ qua kèm thông báo.

---

## 4. Kiểm chứng (ma trận truy vết rút gọn)

| Mục tiêu PRD | Yêu cầu SRS | Bằng chứng |
|---|---|---|
| G1 hứng thú | SRS-F-16 | Khảo sát trong CSV so với lớp thường |
| G2 hình dung, ghi nhớ | SRS-F-01..03, F-16 | Bài kiểm tra trước/sau (giấy) + câu "hình dung" trong khảo sát |
| G3 tư duy mở rộng | SRS-F-05..08, F-10..12 | Tỷ lệ học sinh chọn phương án khác gốc (phân bố, CSV) |
| G4 nội dung đúng | SRS-Q-01, Q-02, F-20..21 | Cố vấn duyệt; nhãn cảnh báo |
| G5 giáo viên muốn dùng lại | SRS-F-10..19 | Phỏng vấn giáo viên |

Tiêu chí nghiệm thu demo (trước T9): mọi E2E xanh; 81 tổ hợp đúng SRS-F-06, Q-02, Q-03; chạy thử trên
máy yếu thật của trường và một điện thoại; CSV không có trường định danh.

## 5. Phụ lục: câu hỏi mở (từ PRD, chưa chặn demo kỹ thuật)
THCS hay THPT; người mua; ngày bắt đầu T1 và lịch trường; ai là cố vấn sử học và nguồn chuẩn; bản
quyền asset; tên sản phẩm (hiện dùng "Sử Việt" theo giao diện của Trung); có cân bằng lại hệ số để
79% phương án khác không rơi vào mức "challenging" hay không.

## 6. Atlas Việt Nam (v2)

Bản đồ 3D để tìm bài giảng theo địa danh (`#/atlas`). Mã `SRS-A-*` riêng để không trùng mã của bài giảng.
Trạng thái chi tiết ở `docs/spec/SPEC.vi.md` mục 15.

| Mã | Yêu cầu | Ưu tiên | Kiểm thử |
|---|---|---|---|
| SRS-A-01 | Bản đồ hiện đúng 34 đơn vị cấp tỉnh theo Nghị quyết 202/2025/QH15; Hoàng Sa thuộc TP Đà Nẵng, Trường Sa thuộc tỉnh Khánh Hòa | P0 | Unit `tests/atlas/data.test.mjs` |
| SRS-A-02 | Mỗi địa danh có tên, loại, tỉnh, toạ độ, mô tả tự viết bằng tiếng Việt, nguồn kèm giấy phép và nhãn minh họa; nằm trong tỉnh của nó | P0 | Unit |
| SRS-A-03 | Tìm kiếm không phân biệt dấu, chịu lỗi gõ (Levenshtein ≤ 2), xếp hạng tên trùng khớp trước; lọc theo 5 loại địa danh | P0 | Unit `tests/atlas/search.test.mjs` |
| SRS-A-04 | Chọn địa danh (trên bản đồ hoặc danh sách) thì camera bay tới đó và thẻ hiện mô tả, thời kỳ, nguồn, nút "Mở bài giảng" tới `#/lesson/<id>`; học sinh chỉ thấy bài được phép xem | P0 | Ảnh chụp harness; E2E `tests/e2e/atlas.spec.js` |
| SRS-A-05 | Trạng thái (địa danh, bộ lọc, từ khoá) nằm trên URL `#/atlas?place=&kind=&q=` và mở lại đúng khung nhìn | P1 | Unit (bộ mã hoá URL); E2E `atlas.spec.js` (tải lại trang) |
| SRS-A-06 | Dùng được hoàn toàn bằng bàn phím; nhãn bản đồ là chữ HTML, không vẽ trong canvas; có chế độ đồ hoạ thấp | P1 | E2E (chọn bằng Enter, tiêu điểm chuyển sang thẻ); detector impeccable |
| SRS-A-07 | Trên phone (360×800) bản đồ không bị che: bảng tìm kiếm là bottom sheet, camera canh giữa phần còn thấy | P1 | Ảnh chụp 360×800 |
| SRS-A-08 | Ghi công "© OpenStreetMap contributors" luôn hiện; không analytics, không lấy vị trí người dùng | P0 | `scripts/check.sh`; E2E `atlas.spec.js` |
| SRS-A-09 | three.js và dữ liệu atlas chỉ tải khi vào `#/atlas`; ranh giới ≤ 400 KB gzip, địa hình ≤ 2 MB; mục tiêu ≥ 55 FPS desktop, ≥ 30 FPS phone | P1 | Unit (dung lượng); FPS: 60 (trần vsync) trên Intel Iris Xe, desktop và khung phone; chưa đo trên điện thoại thật; `npm run budget` trong CI |
| SRS-A-10 | Liên kết hai chiều bài giảng ↔ địa danh: trang bài học liệt kê `atlasPlaceIds` dẫn tới `#/atlas?place=`; thẻ địa danh/tỉnh dẫn tới bài; mọi `atlasPlaceIds` phải trỏ tới địa danh, tỉnh hoặc quần đảo có thật; thanh điều hướng và hai bảng điều khiển có lối vào atlas | P0 | `npm run atlas:test`; E2E `atlas.spec.js` |
