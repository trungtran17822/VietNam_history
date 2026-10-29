# Mô Phỏng Lịch Sử 3D Tương Tác: Trận Ngọc Hồi - Hạ Hồi (Mùa Xuân 1789)
## Phiên Bản Lớp Học & Kế Hoạch Bài Dạy (Classroom Lesson Planner)

Ứng dụng web tương tác một trang (Single-Page Application) mô phỏng 3D bài học lịch sử Việt Nam dành cho học sinh và giáo viên THCS / THPT, được thiết kế theo phong cách sổ bài giảng trường học thực tế (**School Lesson Planner**), tối ưu cho máy chiếu lớp học, máy tính để bàn và điện thoại di động.

Nguyên mẫu tập trung vào bài học thí điểm: **Trận đánh Ngọc Hồi - Hạ Hồi (Đại thắng Kỷ Dậu 1789)** do Hoàng đế Quang Trung chỉ huy, kết hợp vòng lặp học tập sư phạm:
> **Lịch bài giảng** ➔ **Tiến trình 6 giai đoạn lên lớp** ➔ **Sa bàn 3D lịch sử 1789** ➔ **Nhân vật lịch sử đặt câu hỏi** ➔ **Học sinh thử phương án khác** ➔ **Mô phỏng 3D lại phương án mới** ➔ **So sánh số liệu minh bạch** ➔ **Tổng kết & củng cố**.

---

## 🌟 CÁC CẬP NHẬT MỚI

### A. Giao diện Kế hoạch Bài dạy Chuẩn Sư Phạm (Classroom-Style Lesson UI)
1. **Màn hình chính "Lịch bài giảng" (Schedule View)**:
   - Danh sách bài giảng phân bố theo ngày trong tuần (Thứ Hai, Thứ Tư, Thứ Sáu, Tuần sau...).
   - Hiển thị đầy đủ thông tin: Đề bài, Môn học & Khối lớp (Lịch sử 11), Giáo viên phụ trách, Tiết học / Thời lượng (45 phút), Mục tiêu bài dạy, và Trạng thái (*Đang học / Đã học / Sắp có*).
   - Bài học thí điểm **"Trận Ngọc Hồi - Hạ Hồi"** là thẻ hoạt động chính; kèm 2-3 thẻ bài học xám mờ "Sắp có" trong phân phối chương trình kèm ghi chú *"Dữ liệu minh họa"*.
2. **Trang chi tiết bài học (Lesson Detail Page)**:
   - Header hiển thị bài học, giáo viên, ngày dạy, khối lớp, mục tiêu và khung **"Đề bài / Câu hỏi trọng tâm"**.
   - Thanh tiến trình sư phạm (**Classroom Stepper**) 6 giai đoạn có ước lượng thời gian tương ứng với 6 màn hình:
     *Khởi động (5') ➔ Khám phá 3D gốc (10') ➔ Câu hỏi của vua (8') ➔ Thử cách khác (7') ➔ So sánh (8') ➔ Giải thích & Củng cố (7')*.
3. **Chế độ xem Giáo viên & Học sinh (Teacher / Student View Toggle)**:
   - **Chế độ Giáo viên**:
     - Hiển thị bảng **Sổ tay Sư phạm (Teaching Notes)** theo từng giai đoạn: Gợi ý lời giảng, câu hỏi gợi mở thảo luận nhóm, mục tiêu sư phạm.
     - Nút **"Chiếu lên lớp" (Presentation Mode)**: Tối ưu cho máy chiếu lớp học (phông chữ lớn, ẩn bớt thanh công cụ phụ, mở rộng khung sa bàn 3D).
     - Biểu đồ khảo sát nhanh phương án của cả lớp (*Demo survey summary* mô phỏng 38/40 học sinh đã trả lời).
   - **Chế độ Học sinh**: Tự động ẩn sổ tay sư phạm và số liệu giáo viên, tập trung vào trải nghiệm học tập và tương tác.
4. **Nhãn cảnh báo & Tính minh bạch**:
   - Nhãn thường trực: *"⚠️ Dữ liệu minh họa, chưa được chuyên gia duyệt"*.
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
2. **Giai đoạn 2 - Khám phá (3D gốc)**: Sa bàn 3D diễn biến gốc mùa xuân 1789, thanh trượt dòng thời gian, nút phát/dừng/tua và tra cứu sử liệu.
3. **Giai đoạn 3 - Câu hỏi của vua (Question Screen)**: Vua Quang Trung đặt thử thách; học sinh chọn 4 biến số (Hướng tiến quân, Thời điểm, Loại khiên, Đội hình voi). Ở chế độ Giáo viên: xem biểu đồ phân bố lựa chọn demo của cả lớp.
4. **Giai đoạn 4 - Thử cách khác (New Scenario Simulation)**: Chạy sa bàn 3D mô phỏng lại theo đúng chiến thuật học sinh đã lựa chọn.
5. **Giai đoạn 5 - So sánh (Comparison Screen)**: Đối chiếu định lượng giữa phương án gốc và giả định của học sinh; bảng ghi chú cảnh báo giả lập và danh sách công thức/giả định toán học.
6. **Giai đoạn 6 - Giải thích & Củng cố (Explanation Screen)**: Vua Quang Trung bình luận, phân tích bối cảnh, tôn vinh tinh thần phản biện và giao nhiệm vụ tổng kết bài dạy.

---

## 🚀 Hướng dẫn mở ứng dụng

1. **Khuyến nghị**: chạy qua web server cục bộ để tránh giới hạn của một số trình duyệt khi mở module hay tài nguyên từ `file:///`:
   ```bash
   python3 -m http.server 8080
   ```
   Sau đó truy cập `http://localhost:8080` trên trình duyệt.
2. **Mở trực tiếp**: Nháy đúp `index.html`. Các phông Noto và dữ liệu seed được lưu cục bộ; tính năng không được trình duyệt cho phép từ `file:///` vẫn có thể cần server cục bộ.

## Họa tiết sa bàn

Renderer dùng họa tiết vẽ thủ công bằng canvas làm mặc định. Có thể thay từng họa tiết bằng PNG nền trong suốt trong `assets/sprites`; tên tệp và kích thước gợi ý nằm trong [assets/sprites/README.md](assets/sprites/README.md). Trang kiểm tra glyph tiếng Việt: `#/fonttest`.
