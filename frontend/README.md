# Mô Phỏng Lịch Sử Tương Tác: Nền Tảng Học Tập Trực Quan
## Phiên Bản Lớp Học & Kế Hoạch Bài Dạy (Classroom Lesson Planner)

Ứng dụng web tương tác một trang (Single-Page Application) mô phỏng bài học lịch sử dành cho học sinh và giáo viên, được thiết kế theo phong cách sổ bài giảng trường học thực tế (**School Lesson Planner**), tối ưu cho máy chiếu lớp học, máy tính để bàn và điện thoại di động.

Nguyên mẫu kết hợp vòng lặp học tập sư phạm:
> **Lịch bài giảng** ➔ **Tiến trình 6 giai đoạn lên lớp** ➔ **Khám phá tư liệu tương tác** ➔ **Câu hỏi trọng tâm** ➔ **Học sinh thử phương án khác** ➔ **Mô phỏng lại phương án mới** ➔ **So sánh số liệu minh bạch** ➔ **Củng cố & Tổng kết**.

---

## 🌟 CÁC CẬP NHẬT MỚI

### A. Giao diện Kế hoạch Bài dạy Chuẩn Sư Phạm (Classroom-Style Lesson UI)
1. **Màn hình chính "Lịch bài giảng" (Schedule View)**:
   - Danh sách bài giảng phân bố theo ngày trong tuần (Thứ Hai, Thứ Tư, Thứ Sáu, Tuần sau...).
   - Hiển thị đầy đủ thông tin: Đề bài, Môn học & Khối lớp, Giáo viên phụ trách, Tiết học / Thời lượng (45 phút), Mục tiêu bài dạy, và Trạng thái (*Nháp / Đã lên lịch / Đã dạy*).
2. **Trang chi tiết bài học (Lesson Detail Page)**:
   - Header hiển thị bài học, giáo viên, ngày dạy, khối lớp, mục tiêu và khung **"Đề bài / Câu hỏi trọng tâm"**.
   - Thanh tiến trình sư phạm (**Classroom Stepper**) 6 giai đoạn có ước lượng thời gian tương ứng với 6 màn hình:
     *Khởi động (5') ➔ Khám phá tư liệu (10') ➔ Câu hỏi trọng tâm (8') ➔ Thử cách khác (7') ➔ So sánh (8') ➔ Củng cố & Tổng kết (7')*.
3. **Chế độ xem Giáo viên & Học sinh (Teacher / Student View Toggle)**:
   - **Chế độ Giáo viên**:
     - Hiển thị bảng **Sổ tay Sư phạm (Teaching Notes)** theo từng giai đoạn: Gợi ý lời giảng, câu hỏi gợi mở thảo luận nhóm, mục tiêu sư phạm.
     - Nút **"Chiếu lên lớp" (Presentation Mode)**: Tối ưu cho máy chiếu lớp học (phông chữ lớn, ẩn bớt thanh công cụ phụ, mở rộng khung sa bàn 3D).
     - **Phiên lớp học** (giai đoạn 3): mở mã 6 ký tự, học sinh nhập mã trên máy của mình; giáo viên thấy số bài đã gửi và tỉ lệ từng phương án, tải CSV ẩn danh và xoá phiên. Cần máy chủ lớp học trong `backend/`; không có máy chủ thì bài học vẫn chạy bình thường.
   - **Chế độ Học sinh**: Tự động ẩn sổ tay sư phạm và số liệu giáo viên, tập trung vào trải nghiệm học tập và tương tác.
4. **Nhãn cảnh báo & Tính minh bạch**:
   - Nhãn thường trực: *"⚠️ Nội dung minh họa, chưa được chuyên gia duyệt"*.
   - Khung cảnh báo bắt buộc tại màn hình so sánh: *"ĐÂY LÀ MÔ PHỎNG DỰA TRÊN Ý KIẾN CỦA HỌC SINH VÀ SỰ KIỆN THỰC TẾ, KHÔNG PHẢI SỰ THẬT LỊCH SỬ..."*.

---

### B. Sa Bàn Tranh Lụa

- Sa bàn là bản đồ 2.5D nhìn nghiêng từ trên xuống, vẽ bằng washes trên nền lụa: ruộng, lối đi, dải nước, cụm mái nhà, tre và núi mờ xa.
- Đội hình là các sprite mực và màu nước được tạo bằng canvas rồi dựng theo lô bằng `InstancedMesh`; đội hình có độ lệch vị trí, biến thể hình vẽ, bóng mực và chuyển động nhẹ.
- Bốn preset camera: **Toàn cảnh sa bàn**, **Theo quân**, **Cận cảnh**, **Từ trên**. Các nhãn địa hình là HTML overlay; không có chữ tiếng Việt trong geometry hoặc atlas canvas.
- Sơ đồ, màu phe, trang phục và cách bố trí đều là minh họa, chờ chuyên gia thẩm định; chúng không khẳng định tính chính xác lịch sử.
- Chất lượng thấp giảm số instance được vẽ, tắt các lớp sương và không bật bóng WebGL.

---

## 🧭 Luồng 6 màn hình (6-Stage Stepper Flow)

1. **Giai đoạn 1 - Khởi động (Intro Screen)**: Giới thiệu bối cảnh, mục tiêu học tập và nút "Bắt đầu bài học".
2. **Giai đoạn 2 - Khám phá tư liệu (Exploration Screen)**: Trực quan hóa diễn biến hoặc biểu đồ tư liệu, thanh trượt dòng thời gian, nút phát/dừng/tua và tra cứu sử liệu.
3. **Giai đoạn 3 - Câu hỏi trọng tâm (Question Screen)**: Người dẫn chuyện đặt vấn đề; học sinh chọn các biến số chiến thuật/quyết định lịch sử. Phương án gốc được đánh dấu "Phương án lịch sử". Bảng bên cạnh: giáo viên mở phiên lớp và xem tỉ lệ lựa chọn...
4. **Giai đoạn 4 - Thử cách khác (New Scenario Simulation)**: Chạy mô phỏng lại theo đúng chiến thuật/phương án học sinh đã lựa chọn.
5. **Giai đoạn 5 - So sánh (Comparison Screen)**: Đối chiếu định lượng giữa phương án gốc và giả định của học sinh; bảng ghi chú cảnh báo giả lập và danh sách công thức/giả định toán học.
6. **Giai đoạn 6 - Củng cố & Tổng kết (Explanation Screen)**: Người dẫn chuyện bình luận, phân tích bối cảnh, tôn vinh tinh thần phản biện và giao nhiệm vụ tổng kết bài dạy.

---

## 🚀 Hướng dẫn mở ứng dụng

1. **Khuyến nghị**: chạy qua web server cục bộ để tránh giới hạn của một số trình duyệt khi mở module hay tài nguyên từ `file:///`:
   ```bash
   python3 -m http.server 8080
   ```
   Sau đó truy cập `http://localhost:8080` trên trình duyệt. Muốn thử phiên lớp học, chạy thêm máy chủ lớp học ở thư mục gốc: `npm run dev:backend` (cổng 8787; xem `backend/README.md`).
2. **Mở trực tiếp**: Nháy đúp `index.html`. Các phông Noto và dữ liệu seed được lưu cục bộ; tính năng không được trình duyệt cho phép từ `file:///` vẫn có thể cần server cục bộ.

## Kiến trúc

Các tệp `js/*.js` là `<script>` thường (không phải ES module), giao tiếp qua đối tượng `window`. Thứ tự nạp trong `index.html`: `text.js` → `auth.js` → `audio.js` → `lesson-data.js` → `storage.js` → `engine.js` → `scene-map.js` → `config.js` → `class-session.js` → `class-panel.js` → `app.js`.

| Tệp | Vai trò |
| --- | --- |
| `app.js` | Bộ điều khiển: định tuyến theo hash (`#/teacher`, `#/student`, `#/lesson/<id>`, `.../edit`, `.../preview`, `.../interactive`), bảng điều khiển giáo viên, trình soạn bài (có hoàn tác/làm lại), màn hình học sinh và vòng lặp 6 giai đoạn. |
| `lesson-data.js` | `SEED_LESSONS`: dữ liệu bài học mẫu (phần, câu hỏi, ghi chú giáo viên, biến mô phỏng, đạo cụ, camera). |
| `storage.js` | `LessonStorage`: lưu bài học trong `localStorage`, nhập/xuất JSON; học sinh chỉ thấy bài có trạng thái "Đã dạy" và ngày không quá hôm nay. |
| `engine.js` | `SimulationEngine`: tính toán xác định từ hệ số trong dữ liệu bài học. Chỉnh hệ số trong dữ liệu, không sửa mã. |
| `scene-map.js` | `BattleScene3D`: sa bàn Three.js. `scene3d.js` là bản cũ, không được nạp. |
| `config.js` | `APP_CONFIG`: địa chỉ máy chủ lớp học. Trên `localhost` là `http://localhost:8787`; bản triển khai dùng `DEPLOYED_API_BASE` (để trống thì tắt tính năng lớp học). |
| `class-session.js` | `ClassSession`: gọi API phiên lớp (mở, tham gia, gửi, tổng hợp, CSV, xoá). |
| `class-panel.js` | `ClassPanel`: bảng giáo viên / thẻ tham gia ở giai đoạn 3 và khảo sát ở giai đoạn 6. |
| `auth.js` | Đăng nhập demo phía máy khách (`admin` / `123`, lưu trong `sessionStorage`). |
| `text.js`, `audio.js` | Chuẩn hóa NFC tiếng Việt; âm thanh trận đánh bằng Web Audio. |

Nếu đã có dữ liệu trong trình duyệt, thay đổi `SEED_LESSONS` sẽ không hiện ra: xóa khóa `history_sim_lessons_db_v2` hoặc tăng `STORAGE_KEY_LESSONS` trong `storage.js`.

Kiểm tra tĩnh (cú pháp JS, JSON, tham chiếu trong `index.html`): `bash ../scripts/check.sh`.

## Họa tiết sa bàn

Renderer dùng họa tiết vẽ thủ công bằng canvas làm mặc định. Có thể thay từng họa tiết bằng PNG nền trong suốt trong `assets/sprites`; tên tệp và kích thước gợi ý nằm trong [assets/sprites/README.md](assets/sprites/README.md). Trang kiểm tra glyph tiếng Việt: `#/fonttest`.
