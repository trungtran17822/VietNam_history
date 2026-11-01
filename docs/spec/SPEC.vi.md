# Đặc tả: Mô phỏng bài học Lịch sử 3D tương tác (demo Ngọc Hồi - Hạ Hồi)

| | |
|---|---|
| Trạng thái | Bản nháp 2, ngày 01/11/2026. Lộ trình rút từ 17 tuần xuống **12 tuần (tối đa 15 tuần)**. Bản tiếng Anh: [SPEC.md](SPEC.md) |
| Nguồn | PRD `docs/prd/PRD và lộ trình demo Mô phỏng lịch sử 3D.docx` (lộ trình đã được cập nhật ngày 01/11/2026 cho khớp mục 11 của đặc tả này) và mã nguồn prototype trong `prototype/` tại commit `cba3e58` |
| Tên sản phẩm | Chưa quyết định (câu hỏi mở trong PRD) |
| Ngôn ngữ giao diện | Tiếng Việt. Mọi nội dung học sinh và giáo viên nhìn thấy đều bằng tiếng Việt; đặc tả này trích nguyên văn các chuỗi giao diện |

Cách đọc: mục 1-6 nói **sản phẩm phải làm gì**. Mục 7 nói **hiện đã có gì** so với từng yêu cầu, đã kiểm tra trong code. Mục 8-10 là hợp đồng kỹ thuật theo đúng code đang chạy. Mục 11 là lịch trình (12 tuần, tối đa 15). Mục 12 liệt kê **những chỗ PRD, README và code mâu thuẫn nhau**; nên đọc trước khi lập kế hoạch.

Quy ước: mã yêu cầu (F1-F11), tên trường dữ liệu, tên hàm và đường dẫn tệp giữ nguyên như trong bản tiếng Anh và trong code.

---

## 1. Vấn đề và mục đích

Học sinh thấy môn Lịch sử khô khan vì chỉ có chữ và bài giảng, và rất khó hình dung một trận đánh. Người quản lý sản phẩm (PM) cũng cho rằng việc dạy Sử yếu kém làm giảm lòng yêu nước của giới trẻ. **Cả hai đều là giả thuyết của PM, chưa phải kết quả nghiên cứu**; chỉ giả thuyết thứ nhất được kiểm chứng qua buổi dạy thử (PRD Phần 2, §2).

Sản phẩm biến một bài Lịch sử trong sách giáo khoa thành mô phỏng 3D dựa trên sách giáo khoa và các nguồn được nhà nước công nhận. Cuối bài, một nhân vật lịch sử (bản thử nghiệm: Hoàng đế Quang Trung) hỏi học sinh sẽ làm khác đi như thế nào, mô phỏng phương án của học sinh, so sánh số liệu với cách làm của tiền nhân và giải thích sự khác biệt. Mục tiêu là mở rộng tư duy của học sinh, **không phải chấm đúng sai**.

Việc có hay không sản phẩm tương tự ở nước ngoài nhưng chưa có ở Việt Nam là nhận định của PM và chưa được kiểm chứng.

## 2. Mục tiêu và ngoài phạm vi (demo)

**Mục tiêu** (mỗi mục là một giả thuyết mà demo phải tạo ra bằng chứng):

| # | Mục tiêu | Đo bằng (ngưỡng đặt ở bước 1 của kế hoạch, trước khi xây dựng) |
|---|---|---|
| G1 | Học sinh hứng thú hơn so với giờ học thường | Khảo sát ngắn so với lớp học thường |
| G2 | Học sinh hình dung và nhớ trận đánh tốt hơn | Bài kiểm tra ngắn trước và sau |
| G3 | Vòng lặp "nhân vật hỏi, học sinh thử cách khác, so sánh số liệu" mở rộng tư duy | Số học sinh chọn và giải thích một phương án khác bản gốc; phỏng vấn |
| G4 | Nội dung trung thành với nguồn | Chuyên gia duyệt; tỉ lệ sai/bịa trên bộ câu hỏi kiểm thử nhân vật |
| G5 | Giáo viên muốn dùng lại | Phỏng vấn giáo viên |

**Ngoài phạm vi** (rõ ràng không làm trong demo):

- Bán sản phẩm, hoặc phủ toàn bộ sách giáo khoa.
- Ý tưởng tự do của học sinh được AI chuyển thành mô phỏng (giai đoạn sau, khi bản cơ bản ổn định).
- VR, ứng dụng điện thoại gốc, tài khoản người dùng thật, thanh toán.
- Bất kỳ tuyên bố nào cho rằng số liệu mô phỏng là sự thật lịch sử.

## 3. Người dùng

| Người dùng | Nhu cầu | Ghi chú |
|---|---|---|
| Học sinh | Hiểu bài, thấy vui, nêu quan điểm riêng mà không sợ sai | Cấp học (THCS hay THPT) chưa quyết định |
| Giáo viên Lịch sử | Chiếu lên lớp, vừa một tiết, bám sát sách giáo khoa | Quyết định có dùng hay không |
| Chuyên gia / cố vấn Lịch sử | Bảo đảm nội dung và giả định không dạy sai lịch sử | Người duyệt; không phải người dùng cuối |
| Nhà trường | Đáng tin cậy, dễ triển khai trên thiết bị sẵn có | Khách hàng tiềm năng, chưa xác định |

**Câu chuyện người dùng (P0)**

- Là giáo viên, tôi muốn phát, tạm dừng, tua lại và đổi góc nhìn trên trận đánh gốc để có thể dừng ở bất kỳ thời điểm nào và giảng giải.
- Là học sinh, tôi muốn mở nguồn đằng sau từng ghi chú thuyết minh để biết thông tin đến từ đâu.
- Là học sinh, tôi muốn chọn một chiến thuật khác từ một danh sách ngắn để xem điều gì sẽ xảy ra mà không phải gõ gì.
- Là học sinh, tôi muốn màn hình so sánh nói rõ đây là mô phỏng và hiển thị các giả định để không nhầm với lịch sử.
- Là học sinh, tôi muốn Hoàng đế phản hồi một cách khích lệ, không bao giờ bảo tôi sai, để tôi muốn thử tiếp.

## 4. Phạm vi demo

**Trong phạm vi:** một bài học (Ngọc Hồi - Hạ Hồi); mô phỏng 3D diễn biến gốc từ bộ dữ liệu đã được duyệt; Hoàng đế đặt 1-2 câu hỏi cuối bài; 3-5 biến số học sinh có thể thay đổi, chọn từ một danh sách cố định; màn hình so sánh (gốc và mới) kèm thông báo "đây là mô phỏng" và danh sách giả định; chạy trên trình duyệt web, máy tính và điện thoại.

**Ngoài phạm vi:** các bài học khác; nhập văn bản tự do; VR; ứng dụng gốc; tài khoản; thanh toán.

## 5. Luồng bài học

PRD mô tả một buổi 15-20 phút; prototype đặt nó trong giáo án 45 phút (mục 12, điểm 7).

Luồng theo PRD:

1. Giáo viên mở bài và chiếu mô phỏng 3D gốc kèm thuyết minh và ghi chú có nguồn.
2. Giáo viên có thể tạm dừng, tua lại, đổi góc nhìn.
3. Hoàng đế xuất hiện và hỏi về nội dung vừa học.
4. Hoàng đế hỏi: "nếu các con là chúng ta, các con sẽ làm khác đi điều gì?" Một học sinh (hoặc cả lớp) chọn một phương án cho mỗi biến số.
5. Hệ thống mô phỏng phương án của học sinh trong 3D.
6. Màn hình so sánh hiển thị số liệu gốc và số liệu mới, thông báo đây là mô phỏng, và các giả định.
7. Hoàng đế giải thích sự khác biệt và điều kiện thực tế thời đó, mời hỏi thêm, và **không bao giờ chê bai hay nói học sinh sai**.

Các giai đoạn của prototype (đúng như đã xây, `prototype/README.md`): Khởi động 5' → Khám phá 3D gốc 10' → Câu hỏi của vua 8' → Thử cách khác 7' → So sánh 8' → Giải thích & Củng cố 7' = 45'.

## 6. Yêu cầu

P0 = bắt buộc có trong demo. P1 = nên có nếu còn thời gian. Tiêu chí chấp nhận lấy từ PRD, siết lại ở chỗ PRD chưa rõ.

| ID | Yêu cầu | Ưu tiên | Tiêu chí chấp nhận |
|---|---|---|---|
| F1 | Mô phỏng 3D diễn biến gốc của trận Ngọc Hồi - Hạ Hồi | P0 | Diễn biến, mốc thời gian và lực lượng khớp với bộ dữ liệu đã duyệt; cố vấn Lịch sử ký duyệt |
| F2 | Phát lại: phát, tạm dừng, tua/tìm vị trí, đổi góc nhìn | P0 | Giáo viên dừng được ở bất kỳ thời điểm nào |
| F3 | Thuyết minh và ghi chú kèm nguồn | P0 | Mọi sự kiện chính đều có ghi chú; bấm vào hiện nguồn |
| F4 | Hoàng đế đặt 1-2 câu hỏi cuối bài | P0 | 1-2 câu hỏi gắn với bài học |
| F5 | Học sinh chọn phương án thay thế từ danh sách biến số | P0 | 3-5 biến số, mỗi biến có ≥2 phương án có cơ sở lịch sử |
| F6 | Bộ máy mô phỏng chạy phương án của học sinh | P0 | Cùng đầu vào luôn cho cùng số liệu; xem được mọi giả định |
| F7 | Màn hình so sánh gốc và mới | P0 | Hiện số liệu, thông báo "đây là mô phỏng" và danh sách giả định; thông báo không thể bị bỏ sót trên màn hình này |
| F8 | Hoàng đế giải thích sự khác biệt, theo hướng khích lệ | P0 | Nêu bối cảnh và điều kiện thực tế; không đưa ra phán quyết đúng/sai tuyệt đối |
| F9 | Hỏi đáp tự do với nhân vật, chỉ trả lời từ dữ liệu đã duyệt | P1 | Nói "tài liệu không ghi lại" khi dữ liệu không có; đạt ngưỡng của bộ kiểm thử. **Cắt khỏi demo nếu chưa đạt vào hết T7.** |
| F10 | Chế độ giáo viên: chiếu lên lớp, xem phân bố lựa chọn của cả lớp | P1 | Giáo viên thấy phân bố lựa chọn của học sinh trong buổi học |
| F11 | Dữ liệu thử nghiệm ẩn danh: lựa chọn, thời gian dùng, kết quả khảo sát | P1 | Xuất được cho báo cáo bước 9; không có dữ liệu cá nhân. Dự phòng: phiếu giấy |

**Yêu cầu phi chức năng**

| Lĩnh vực | Yêu cầu |
|---|---|
| Tính đúng của nội dung | Mọi sự kiện hiển thị đều có nguồn. Nội dung chưa được chuyên gia duyệt không được đến tay học sinh; cho đến khi đó giao diện gắn nhãn "Nội dung minh họa, chưa được chuyên gia duyệt" và **phải giữ nhãn này** |
| Khả năng giải thích | Mọi số liệu so sánh truy được về giả định và tham số của bộ máy |
| Hiệu năng | Chạy trên trình duyệt ở máy yếu của trường và điện thoại. **Chưa đặt** ngưỡng cụ thể; đặt sau khi thử trên thiết bị thật (mốc kế hoạch T5) |
| Ngôn ngữ | Giao diện và nhân vật bằng tiếng Việt; văn bản được chuẩn hóa NFC |
| Quyền riêng tư | Học sinh là trẻ vị thành niên: chỉ thu thập dữ liệu ẩn danh, không thông tin cá nhân; cần phiếu đồng ý của nhà trường và phụ huynh trước buổi thử |
| Tái sử dụng | Bộ máy, bộ tài nguyên và hệ thống nhân vật tách khỏi nội dung từng bài |

## 7. Hiện trạng so với yêu cầu (đã kiểm tra ngày 01/11/2026)

Chú giải: **Đã có** = chạy được trong prototype; **Một phần**; **Chưa có**. "Đã có" không bao giờ có nghĩa là "đã duyệt": toàn bộ nội dung bài học là minh họa và chưa được duyệt.

| ID | Trạng thái | Bằng chứng và lưu ý |
|---|---|---|
| F1 | Đã có (minh họa) | Cảnh bản đồ lụa 2.5D, 4 góc nhìn, 4 chương trên dòng thời gian ([scene-map.js](../../prototype/js/scene-map.js), [lesson-data.js](../../prototype/js/lesson-data.js)). Chưa được chuyên gia xác nhận nên tiêu chí chấp nhận **chưa đạt** |
| F2 | Đã có | Nút phát/tạm dừng, tua lại, thanh dòng thời gian và các góc nhìn trong màn hình xem và trong các màn hình 6 giai đoạn ([index.html](../../prototype/index.html) khoảng L477-483, 639-645; [app.js](../../prototype/js/app.js) L1550) |
| F3 | Đã có (nguồn chưa kiểm chứng) | Mỗi chương có thuyết minh, chú thích, nhãn thời gian và nút "Xem nguồn" ([app.js](../../prototype/js/app.js) L1656). Nguồn là các chuỗi `{book, chapter, quote, note}` nằm ngay trong dữ liệu (ví dụ *Hoàng Lê nhất thống chí*, *Đại Nam chính biên liệt truyện*); không có gì trong repo đối chiếu chúng với danh mục nguồn (xem mục 12 điểm 1) |
| F4 | Đã có | Lời thoại `question.character` cùng câu hỏi `q-3` có cờ `isEmperorQuestion` |
| F5 | Đã có | 4 biến số × 3 phương án = 81 tổ hợp (mục 9.2). Số phương án vượt mức tối thiểu 2 của PRD; cơ sở lịch sử của chúng chưa được duyệt |
| F6 | Đã có, đã kiểm chứng | Đã chạy cả 81 tổ hợp hai lần qua `SimulationEngine.calculate`: kết quả giống hệt nhau. Bộ máy không có yếu tố ngẫu nhiên. Việc đơn vị trong cảnh xê dịch ngẫu nhiên dùng `Math.random` ([scene-map.js](../../prototype/js/scene-map.js) L429-511); không làm thay đổi con số nào |
| F7 | Đã có | Thông báo "ĐÂY LÀ MÔ PHỎNG DỰA TRÊN Ý KIẾN CỦA HỌC SINH VÀ SỰ KIỆN THỰC TẾ, KHÔNG PHẢI SỰ THẬT LỊCH SỬ." được viết cứng trên màn hình so sánh ([index.html](../../prototype/index.html) L732); giả định hiển thị từ `appliedAssumptions` ([app.js](../../prototype/js/app.js) L2322) |
| F8 | Đã có | `generateExplanation` chọn đoạn `variableFeedbacks[variable][option]` có sẵn, kèm lời mở đầu và lời kết khích lệ ([engine.js](../../prototype/js/engine.js), [app.js](../../prototype/js/app.js) L2341). Kịch bản có sẵn, không dùng LLM |
| F9 | **Chưa có** | Không có LLM, không có máy chủ, do cách thiết kế của prototype |
| F10 | **Chưa có** | Không có màn hình phân bố của lớp. README tuyên bố có biểu đồ khảo sát "38/40" nhưng `index.html` và `js/` không cài đặt (mục 12 điểm 3) |
| F11 | **Một phần** | `LessonStorage.saveStudentRun` lưu lựa chọn/kết quả lần chạy gần nhất **cho mỗi bài trong `localStorage`**, ghi đè; không có xuất dữ liệu, không có khảo sát ([storage.js](../../prototype/js/storage.js) L236-273) |

Chỉ có **1 trong 4 bài mẫu là hoàn chỉnh**: Ngọc Hồi có 4 chương và 4 biến số. Rạch Gầm (3 chương), Chi Lăng (1 chương) và bài Mông-Nguyên (0 chương) không có biến số mô phỏng, nên các giai đoạn câu hỏi/mô phỏng/so sánh không có gì để chạy với chúng.

## 8. Kiến trúc (đúng như đã xây)

Ứng dụng web một trang. Không có bước build, không có trình quản lý gói, không có bộ kiểm thử. HTML/CSS/JS thuần cùng three.js được đóng gói sẵn. Chỉ là tệp tĩnh; triển khai lên Vercel từ thư mục `prototype/` ([vercel.json](../../vercel.json)).

```
prototype/
  index.html          mọi màn hình trong một trang, chuyển bằng showView
  js/                 thẻ <script> cổ điển, chia sẻ qua biến toàn cục window
  css/                theme.css (token, bảng màu cảnh) → fonts.css → style.css → editorial.css (nạp sau cùng)
  vendor/             three.min.js (~603 KB), OrbitControls.js
  fonts/ assets/      woff2 Noto cục bộ (108 KB); thư mục ghi đè sprite (12 KB)
  data/               lesson.root-copy.json, sources.json  (KHÔNG script nào nạp)
```

**Thứ tự nạp script rất quan trọng** ([index.html](../../prototype/index.html) L913-922): `three.min.js` → `text.js` → `OrbitControls.js` → `auth.js` → `audio.js` → `lesson-data.js` → `storage.js` → `engine.js` → `scene-map.js` → `app.js`.

| Module | Biến toàn cục | Trách nhiệm |
|---|---|---|
| `text.js` | - | Vá các setter `textContent`/`innerHTML` để chuẩn hóa NFC tiếng Việt. Phải nạp đầu tiên |
| `auth.js` | `window.Auth` | **Chỉ là đăng nhập demo phía client** (`sessionStorage`); `admin` / `123` cho cả giáo viên và học sinh. Không phải bảo mật |
| `audio.js` | `window.BattleAudio` | Âm thanh trận đánh sinh bằng Web Audio |
| `lesson-data.js` | `SEED_LESSONS` | Lược đồ bài học đầy đủ và 4 bài mẫu |
| `storage.js` | `window.LessonStorage` | Bài học trong `localStorage` (nạp mẫu khi trống), nhập/xuất JSON, quy tắc hiển thị cho học sinh, một lần chạy của học sinh cho mỗi bài |
| `engine.js` | `window.SimulationEngine` | `calculate`, `generateExplanation` |
| `scene-map.js` | `window.BattleScene3D` (lớp `SilkMapScene`) | Trình dựng bản đồ lụa Three.js; sprite `InstancedMesh`; 4 góc nhìn; nhãn địa hình là lớp phủ HTML (không bao giờ là chữ trong canvas/hình học); PNG trong `assets/sprites/` ghi đè sprite sinh tự động |
| `app.js` (~2400 dòng) | - | Bộ điều khiển: lưu DOM, bộ định tuyến hash, bảng điều khiển giáo viên + trình soạn thảo (undo/redo), bảng điều khiển học sinh + màn hình xem, vòng 6 giai đoạn |
| `scene3d.js` | - | Trình dựng low-poly cũ, **không được nạp**; hãy sửa `scene-map.js` |

**Đường dẫn (route)** (bộ định tuyến hash): `#/teacher`, `#/student`, `#/lesson/<id>`, `#/lesson/<id>/edit`, `#/lesson/<id>/preview`, `#/fonttest` (kiểm tra glyph tiếng Việt).

**Quy tắc vòng đời cảnh:** mỗi bề mặt (xem trước trong trình soạn thảo, không gian bài học, màn hình xem của học sinh, giai đoạn gốc/tùy chỉnh) sở hữu một `SilkMapScene`, điều khiển qua `updateTimeline`, `setCameraPreset`, `updatePropsVisibility`/`applyPropConfig`, `updateFactionColors`, `updateUnitCounts`, `setQuality`. **Gọi `destroy()` khi gỡ màn hình** để các renderer không chồng chất.

**Lưu trữ**

| Khóa | Nội dung |
|---|---|
| `history_sim_lessons_db_v2` | Toàn bộ bài học. `LessonStorage.init()` chỉ nạp mẫu khi khóa **chưa tồn tại**, nên sửa `SEED_LESSONS` sẽ không hiện trong trình duyệt đã có dữ liệu. Hãy xóa khóa hoặc tăng `STORAGE_KEY_LESSONS` |
| `history_sim_student_runs` | `{ [lessonId]: {choices, results…, timestamp} }`, chỉ giữ lần chạy gần nhất |

**Quy tắc hiển thị cho học sinh** ([storage.js](../../prototype/js/storage.js) L134-160): học sinh chỉ thấy bài học khi `status === 'Đã dạy'` **và** `date <= today`. Các trạng thái: `'Nháp' | 'Đã lên lịch' | 'Đã dạy'`.

## 9. Hợp đồng dữ liệu và mô phỏng

### 9.1 Đối tượng bài học (một phần tử của `SEED_LESSONS` / JSON đã lưu)

| Nhóm trường | Trường |
|---|---|
| Định danh và kế hoạch | `id`, `title`, `subtitle`, `commander`, `opponent`, `year`, `teacher`, `class`, `date`, `subject`, `grade`, `period`, `objectives`, `focusQuestion`, `status`, `isPilot` |
| Nhãn | `disclaimer` ("Nội dung minh họa, chưa được chuyên gia duyệt"), `simulationDisclaimer`, `introSummary` |
| Chương | `sections[]`: `id`, `title`, `narration`, `caption`, `timelineRange` (0-1), `timeLabel`, `source {book, chapter, quote, note}` |
| Câu hỏi | `questions[]`: `id`, `text`, `type` (`multiple_choice` hoặc `open_discussion`), `sectionId`, `isEmperorQuestion`, `isExplanationReleased`, `options[] {id, text, isCorrect, explanation}` hoặc `guide` |
| Chỉ giáo viên | `privateNotes` (ẩn ở chế độ học sinh) |
| Số liệu gốc | `baseline {durationHours, casualties, positionScore, ratingText}` |
| Cảnh | `simulation {propsConfig, unitCounts, factionColors, cameraPresets (overview, follow_troops, close_up, top_down), keyframes[{time, preset}]}` |
| Câu hỏi của Hoàng đế | `question {character {name, dynasty, avatarSvg, greeting, speech}, variables[]}` |
| Biến số | `variables[] {id, title, options[] {id, name, shortName, desc, isOriginal, timeDelta, casualtyDelta, positionScoreDelta, assumptions}}` |
| Giải thích | `explanations {intro, variableFeedbacks[varId][optId], encouragingConclusion}` |

Quy tắc từ PRD: **chỉnh mô hình bằng cách sửa hệ số trong dữ liệu bài học, không bao giờ sửa trong code của bộ máy.** Các hệ số chính là danh sách giả định hiển thị cho học sinh.

### 9.2 Bộ máy ([engine.js](../../prototype/js/engine.js))

Với mỗi biến số, lấy phương án đã chọn (nếu thiếu thì lấy phương án đầu tiên, rồi đến mặc định có độ lệch bằng 0), và cộng các độ lệch:

```
student.durationHours = max(12,  baseline.durationHours + Σ timeDelta)
student.casualties    = max(500, baseline.casualties    + Σ casualtyDelta)
student.positionScore = clamp(baseline.positionScore + Σ positionScoreDelta, 10, 100)
isIdenticalToOriginal = mọi phương án đã chọn đều có isOriginal === true
```

Sắc thái kết quả theo `student.positionScore`: giống bản gốc → `perfect`; ≥75 → `positive`; ≥55 → `moderate`; còn lại → `challenging`. Bộ máy trả về `original`, `student`, `choiceDetails[]` và `appliedAssumptions[]` (biến số, lựa chọn, ba độ lệch, văn bản giải thích).

**Dữ liệu mẫu Ngọc Hồi** (mọi con số đều minh họa, không có nguồn): nền 36 giờ, 1.800 thương vong, điểm thế trận 95.

| Biến số | Phương án gốc | Phương án thay thế (Δthời gian giờ / Δthương vong / Δđiểm) |
|---|---|---|
| 1. Hướng tiến công | `flanking_multidirectional` | `frontal_allout` +8/+950/-18; `siege_starvation` +72/-400/-35 |
| 2. Thời điểm mở màn | `dawn_tet5` | `midday_light` +12/+600/-14; `after_fullmoon` +120/+1100/-40 |
| 3. Che chắn | `wet_straw_shields` | `standard_wood_shields` -4/+850/-15; `dispersed_rush` -6/+1400/-28 |
| 4. Voi chiến | `elephants_vanguard` | `elephants_reserve` +6/+550/-12; `cavalry_instead` -2/+1200/-24 |

**Đo trên cả 81 tổ hợp:** xác định (hai lần chạy giống hệt); đúng 1 tổ hợp bằng bản gốc; thời gian 28-234 giờ; thương vong 1.400-6.450; điểm 10-95. Số lượng theo sắc thái: `perfect` 1, `positive` 4, `moderate` 13, **`challenging` 63**.

> Lo ngại về thiết kế, không phải lỗi: 63 trong 80 phương án khác bản gốc (79%) kết thúc ở sắc thái `challenging`. Kết hợp với các đoạn giải thích, học sinh đổi hầu như bất cứ điều gì cũng bị báo là kế hoạch kém. Điều này không phù hợp với quy tắc của PRD là nhân vật không được khiến học sinh cảm thấy bị chấm điểm. Hãy cùng cố vấn Lịch sử quyết định có nên cân lại hệ số để các phương án hợp lý không gần như đều là "challenging". Làm trong dữ liệu, không làm trong bộ máy.

### 9.3 Quy tắc ghi nhãn (phải giữ nguyên)

- Dải thông báo toàn cục dưới tiêu đề luôn hiển thị "Nội dung minh họa, chưa được chuyên gia duyệt" ([index.html](../../prototype/index.html) L64).
- Chân trang thường trực trên màn hình bài học: "⚠️ Nội dung minh họa, chưa được chuyên gia duyệt" ([index.html](../../prototype/index.html) L558).
- Màn hình so sánh luôn hiện thông báo mô phỏng (mục 7, F7).
- Không bao giờ trình bày số liệu mô phỏng như lịch sử. Không bịa số liệu lịch sử cụ thể trong nội dung bài học; ghi rõ con số nào là minh họa.
- Nhãn địa hình là lớp phủ HTML; không bao giờ đặt chữ tiếng Việt trong canvas hoặc hình học (lỗi glyph và NFC).

## 10. Kiểm tra

Không có bộ kiểm thử tự động. Hiện có:

- `bash scripts/check.sh` (cũng là `/check`): `node --check` cho `js/*.js`; mọi `data/*.json` đều hợp lệ; mọi `src`/`href` cục bộ trong `index.html` đều tồn tại; mọi `js/*.js` (trừ `scene3d.js` cũ) đều được nạp. Chạy trên mọi lần push trong CI; Vercel Preview triển khai từ `Staging`, Production từ `main`.
- Thủ công: nạp bằng `cd prototype && python3 -m http.server 8080`, rồi đi qua 6 giai đoạn ở vai giáo viên và học sinh; kiểm tra `#/fonttest`.

**Danh sách chấp nhận cho demo (chạy xong trước T9, trước buổi dạy thử)**

1. Cả 6 giai đoạn hoàn tất không có lỗi console, ở chế độ giáo viên và học sinh, trên một máy yếu thật của trường và một điện thoại.
2. Màn hình so sánh hiện thông báo mô phỏng và danh sách giả định với từng tổ hợp trong 81 tổ hợp.
3. Cùng lựa chọn cho cùng số liệu qua các lần tải lại (tính xác định của bộ máy; script nằm trong bản thăm dò tạm dùng cho đặc tả này và nên được thêm vào `scripts/`).
4. Chế độ học sinh không bao giờ hiện `privateNotes`, và không bao giờ hiện bài học không thỏa cả hai điều kiện `Đã dạy` và `date <= today`.
5. Mọi sự kiện hiển thị đều có nguồn mà cố vấn đã duyệt; không có nội dung nào đến học sinh khi chưa được duyệt.
6. Dữ liệu xuất của F11 (hoặc phiếu giấy dự phòng) không có dữ liệu cá nhân.
7. Bộ kiểm thử nhân vật (nếu giữ F9): tỉ lệ sai/bịa dưới ngưỡng của nhóm.

## 11. Lịch trình

Sửa ngày 01/11/2026 (Bản nháp 2): **kế hoạch 12 tuần, tối đa 15 tuần.** Thay thế kế hoạch 17 tuần trước đó của Bản nháp 1 và của tài liệu PRD; PRD nay đã mang cùng kế hoạch 12 tuần (xem mục 12 điểm 11). Tuần 1 (T1) **chưa gắn với ngày cụ thể**. Tuần đánh số từ 1, tính cả hai đầu.

**Cấu trúc:** T1-T12 là kế hoạch cam kết. T13-T15 là **quỹ dự phòng**, chỉ dùng khi lỡ một mốc kiểm soát bên dưới; không phải việc đã lên lịch. Nếu hết T15 mà việc chưa xong thì **cắt phạm vi, không kéo dài lịch.**

| Bước | Tuần | Đầu ra / mốc kiểm soát | Phụ trách |
|---|---|---|---|
| 0. Prototype v1.0 | **Xong**, 24-28/10/2026 | Prototype chạy được, nội dung minh họa (F1-F8 đã có, mục 7) | Nhóm |
| 1. Chốt phạm vi | T1 | Bản phạm vi một trang; ngưỡng thành công; **chốt ngày T1 theo lịch của trường**; THCS hay THPT; nhân sự, ngân sách, thiết bị | PM |
| 2. Đối tác chuyên môn | T1-3 | ≥1 giáo viên và ≥1 cố vấn đồng ý; xác định lớp thử; **cam kết trường/ngày thử hạn T5** | PM, Nội dung |
| 3. Bộ dữ liệu đã duyệt | T2-4 | Dữ liệu có nguồn, có nhãn; **cố vấn duyệt vào cuối T4** | Nội dung, Cố vấn |
| 4. Kịch bản bài học | T3-4 | Kịch bản 15-20 phút; 3-5 biến số; câu hỏi của Hoàng đế và giải thích cho từng phương án (F4, F8) | PM, Nội dung |
| 5. Bộ máy | T4-7 | Thay hệ số tạm bằng hệ số có nguồn trong dữ liệu bài học; cân lại độ lệch "challenging" (mục 9.2); lần chạy gốc khớp nguồn; gửi giả định cho cố vấn ở **T6** | AI/Backend |
| 6. Cảnh 3D | T4-7 | Lần chạy gốc theo dữ liệu đã duyệt; mượt trên máy yếu; thử trên thiết bị thật của trường từ **T5** | 3D/Frontend |
| 7. Nhân vật AI | T5-7 | Phần P0 theo kịch bản đã có sẵn, không cần LLM. F9 (LLM + RAG) mức P1 **cắt vào cuối T7 nếu chưa đạt ngưỡng** | AI/Backend |
| 8. Tích hợp và chuẩn bị | T8-9 | **T9: chạy trọn vẹn, không có điểm chặn.** Giáo viên tập dượt; phiếu đồng ý; khảo sát và bài kiểm tra trước/sau sẵn sàng; xuất F11 hoặc phương án phiếu giấy sẵn sàng | Cả nhóm |
| 9. Dạy thử trên lớp | T10-11 | 1-2 lớp; thu dữ liệu để so với lớp học thường | PM, Nội dung |
| 10. Đánh giá | T12 | Báo cáo có số liệu; quyết định: mở rộng sang bài tiếp theo hay làm lại | PM |
| Dự phòng | T13-15 | Chỉ để hấp thụ trễ tiến độ. Không lên lịch việc nào ở đây | PM |

**Vì sao 12 tuần khả thi.** Prototype đã chạy toàn bộ vòng lặp (F1-F8). Vì vậy bước 5 và 6 là công việc nội dung và tinh chỉnh trên code có sẵn, không phải xây từ đầu, và bộ máy vốn đã xác định (mục 9.2).

**Cái giá của 12 tuần** (so với kế hoạch 17 tuần):

- Cố vấn duyệt dữ liệu vào cuối **T4**, không phải T6, nên đây là đường găng. Mọi việc ở bước 5-8 dùng dữ liệu đã duyệt.
- Tuần đệm không còn nằm trong kế hoạch; nó chuyển sang quỹ dự phòng.
- Bước 5, 6 và 7 cùng kết thúc ở T7 và bước 8 không thể bắt đầu trước đó. Bước 8 dài 2 tuần, không phải 3.
- Dạy thử kéo dài 2 tuần (T10-11) và báo cáo 1 tuần (T12).
- Dự kiến sẽ cắt F9 trừ khi nó đạt rõ ràng ở T7. F10 và F11 nên làm ở mức tối thiểu (chấp nhận phiếu giấy cho F11).
- Cần **4-5 người làm toàn thời gian**. Nếu làm bán thời gian, hãy dự kiến dùng quỹ dự phòng và lập kế hoạch theo mức tối đa 15 tuần.

**Mốc kiểm soát kích hoạt quỹ dự phòng:**

| Mốc | Nếu lỡ |
|---|---|
| T4: cố vấn duyệt bộ dữ liệu | Mỗi tuần trễ đẩy bước 5-9 lùi một tuần; buổi thử chuyển vào quỹ dự phòng |
| T5: trường và ngày thử đã cam kết | Không thể chốt buổi thử; báo cáo lên cấp trên, tìm trường thứ hai |
| T9: chạy trọn vẹn không điểm chặn | Dùng tuần dự phòng trước khi buổi thử bắt đầu, không dùng trong lúc thử |
| T7: F9 dưới ngưỡng | Cắt F9 (không kéo dài) |

Điểm chịu áp lực đã biết: **T4** vừa có cố vấn ký duyệt, vừa kết thúc kịch bản, vừa bắt đầu bước 5-6, nên là tuần dễ trễ nhất.

**Lịch.** Buổi thử (T10-11) không được rơi vào kỳ thi hoặc kỳ nghỉ Tết Đinh Mùi (mùng 1 Tết = Thứ Bảy 06/02/2027; ngày nghỉ của trường chưa được xác nhận). Ví dụ: nếu T1 là Thứ Hai 16/11/2026 thì T10-11 là 18-31/01/2027, T12 là 01-07/02/2027, và quỹ dự phòng (T13-15) rơi vào kỳ nghỉ Tết nên không dùng được. T1 càng muộn thì buổi thử càng bị đẩy vào Tết. Hãy chốt ngày T1 ở bước 1 và xác nhận ngày thử với trường trước T5.

## 12. Mâu thuẫn và khoảng trống (cần quyết định hoặc sửa trước khi dựa vào tài liệu)

1. **`prototype/data/sources.json` thuộc về một bài khác.** 4 mục của nó nói về NEP của Liên Xô / bản đồ Liên Xô năm 1922 (sách *Lịch sử và Địa lí 9*, Bài 1), Hiến pháp 2013, trống đồng Ngọc Lũ và hướng dẫn sử dụng cờ. Không mục nào hỗ trợ Ngọc Hồi - Hạ Hồi. Bài Ngọc Hồi ghi nguồn ngay trong dữ liệu bài, và không có gì liên kết hai nơi này. Như vậy "bộ dữ liệu đã duyệt" của PRD (bước 3) **chưa tồn tại**.
2. **Cấp học.** Bài mẫu ghi `grade: 'Khối 11'` (THPT). Sách giáo khoa duy nhất trong repo là *Lịch sử và Địa lí 9* (THCS). PRD để ngỏ THCS hay THPT. Cần chốt ở bước 1; điều này quyết định sách tham chiếu và mức từ vựng.
3. **README từng nói quá về F10. Đã sửa.** `prototype/README.md` từng mô tả biểu đồ khảo sát của lớp ("38/40") mà không có code nào cài đặt; README nay ghi rõ là chưa có. F10 vẫn **chưa có**.
4. **Tài khoản.** PRD đưa "tài khoản người dùng" ra ngoài phạm vi. Prototype có đăng nhập demo, bảng điều khiển giáo viên/trình soạn thảo với nhập/xuất nhiều hơn PRD yêu cầu. Giữ nhãn đăng nhập chỉ là demo; nó không bảo vệ gì. Cần quyết định trình soạn thảo thuộc phạm vi demo hay là phần thưởng phát sinh chi phí bảo trì.
5. **F11.** Chỉ có một bản ghi `localStorage` theo từng bài (không xuất, không khảo sát, chỉ giữ một lần chạy). Nó không đủ để làm báo cáo bước 9.
6. **PRD nói một tệp + `lesson.json`.** Ứng dụng đang chạy lấy bài học từ `js/lesson-data.js` và `localStorage`; `data/lesson.root-copy.json` không được nạp. Ổn với prototype; quy trình nội dung thật (bước 3 → 4) phải xác định một nguồn dữ liệu duy nhất.
7. **Thời lượng.** PRD: 15-20 phút. Giáo án của prototype: 45 phút (6 giai đoạn 5/10/8/7/8/7). Hai điều này khớp nhau chỉ khi 15-20 phút của PRD là phần mô phỏng cốt lõi nằm trong tiết 45 phút; cần xác nhận với giáo viên đối tác.
8. **Viết cứng và theo dữ liệu.** Thông báo ở màn hình so sánh được viết cứng trong `index.html`; trường `simulationDisclaimer` của từng bài chỉ được đọc ở tab không gian bài học ([app.js](../../prototype/js/app.js) L1432). Đổi trường này không đổi chữ ở màn hình so sánh của 6 giai đoạn.
9. **Con số chưa duyệt.** Số liệu nền (36 giờ, 1.800 thương vong, 95) và mọi độ lệch đều là tạm. Văn bản mẫu cũng nêu các con số như "100 voi chiến" và "29 vạn quân" chưa gắn với nguồn đã duyệt. Chúng phải qua bước 3 trước khi học sinh nhìn thấy.
10. **Ngẫu nhiên trong cảnh.** Vị trí các đơn vị trong cảnh được ngẫu nhiên hóa mỗi lần tải; hai lần chiếu cùng một bài trông hơi khác nhau. Chấp nhận được cho demo; chỉ quan trọng nếu cần ảnh chụp tái lập được.
11. **Mâu thuẫn lộ trình. Đã sửa.** Tài liệu PRD (`docs/prd/…`) đã được cập nhật ngày 01/11/2026 theo cùng kế hoạch 12 tuần (tối đa 15), gồm biểu đồ Gantt, số tuần từng bước, các mốc và rủi ro. PRD chưa có dòng rủi ro "12 tuần quá gấp" và hai câu hỏi mở mới ở mục 13 (quy mô nhóm, cố vấn).
12. **Lệch cách diễn đạt. Đã sửa.** Giao diện ghi "Nội dung minh họa, chưa được chuyên gia duyệt" (dải đầu trang và chân trang); `prototype/README.md`, `CLAUDE.md` ở thư mục gốc và `.claude/rules/content-labeling.md` nay ghi giống vậy. Tệp `data/lesson.root-copy.json` (không được nạp) vẫn còn ghi chú "Dữ liệu minh họa"; không ảnh hưởng lúc chạy.

## 13. Câu hỏi mở

| Câu hỏi | Người phụ trách | Chặn việc gì |
|---|---|---|
| Ngày T1; lịch, kỳ nghỉ và kỳ thi của trường thử | PM | Bước 1 (chặn) |
| Nhóm có 4-5 người làm toàn thời gian không? Kế hoạch 12 tuần giả định là có | PM | Bước 1 (chặn) |
| Ai là cố vấn Lịch sử? Hạn duyệt là cuối T4 | PM | Bước 3 (chặn) |
| THCS hay THPT? Dùng sách giáo khoa bản nào làm chuẩn, và ai ký duyệt? | PM, Cố vấn | Bước 1, 3 (chặn) |
| Cả lớp có giáo viên hay tự học ở nhà? | PM | Bước 1 (chặn) |
| Quy mô nhóm, ngân sách, thiết bị thử | PM | Bước 1 |
| Tài nguyên 3D và hình ảnh lấy từ đâu, giấy phép gì? | PM | Bước 6 |
| Trình soạn thảo của giáo viên có thuộc phạm vi demo không? | PM, Dev | Chi phí bảo trì |
| Có cân lại hệ số để các phương án thay thế không còn 79% là "challenging"? | Cố vấn, Nội dung | Bước 5 |
| Tên sản phẩm; ai là người mua (trường, giáo viên, phụ huynh)? | PM | Không chặn demo |
| Danh sách lựa chọn cố định (khuyến nghị) hay nhập tự do cho demo? | PM | Đã nghiêng về danh sách cố định; cần xác nhận |

## 14. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Không tìm được cố vấn Lịch sử hoặc giáo viên | Liên hệ từ tuần 1; dùng prototype v1.0 để thuyết phục |
| Nhân vật AI nói sai hoặc bịa | RAG chỉ trên bộ dữ liệu đã duyệt, "tài liệu không ghi lại" khi không biết, bộ câu hỏi bẫy; cắt F9 ở T7 nếu không đạt |
| Số liệu mô phỏng bị hiểu là sự thật | Thông báo trên mọi màn hình so sánh, giả định hiển thị rõ, mô hình đơn giản và giải thích được |
| 3D tốn quá nhiều thời gian hoặc tiền | Ưu tiên rõ ràng hơn đẹp; tái sử dụng tài nguyên |
| Thiết bị của trường yếu | Web, 3D nhẹ, chế độ chất lượng thấp, thử trên máy thật từ T5 |
| Học sinh cảm thấy bị chấm điểm | Giọng nhân vật khích lệ; giáo viên đọc kịch bản; xem lại độ lệch 79% "challenging" |
| Buổi thử rơi vào kỳ nghỉ hoặc kỳ thi | Chốt T1 theo lịch trường; xác nhận ngày thử với trường trước T5; mức tối đa 15 tuần không còn chỗ dời bước 9 qua Tết nếu T1 muộn (mục 11) |
| Trường hoặc phụ huynh từ chối thu dữ liệu của trẻ vị thành niên | Phiếu đồng ý sẵn sàng trước T9; chỉ dữ liệu ẩn danh; phương án khảo sát giấy |
| 12 tuần quá gấp (cố vấn duyệt trễ, nhân sự bán thời gian) | Mốc kiểm soát và quỹ dự phòng ở mục 11; cắt F9, F10 và F11 trước; không bao giờ kéo dài quá T15 |
