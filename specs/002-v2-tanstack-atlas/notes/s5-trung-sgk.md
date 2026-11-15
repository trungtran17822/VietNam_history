# S5 - Chuyển công việc của Trung (`origin/Process`) sang v2

Nhánh `Dat/feature/v2-sgk-lessons`. Trung làm trên `origin/Process`, tách từ `a9b6b8f` trước khi viết lại v2,
nên toàn bộ nằm trong frontend v1 (`frontend/js/*.js`). Không merge nhánh đó; chỉ chuyển phần có giá trị.
Node 24.22 (`export PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH`).

## Đã chuyển

1. **Bốn bài SGK** (`lesson-data.js` -> `frontend/src/content/lessons/<id>.json`, `schemaVersion` 2, `revision` 1):
   `bai-1-lien-xo` (`ussr_charts`), `bai-2-chau-au-my` (`depression_charts`), `bai-3-chau-a` (`asia_map`),
   `bai-4-chien-tranh-the-gioi-2` (`stalingrad_3d`). Chữ của Trung giữ nguyên: tiêu đề, giai đoạn, lời dẫn,
   nguồn và trích dẫn, câu hỏi, biến số, phương án, giả định, hệ số, giải thích, `keyNotes`, `privateNotes`,
   `reviewFlags`, `timeline`. Chỉ thêm các trường kỹ thuật dưới đây. `isPilot` là `false` (bài thí điểm vẫn là
   Ngọc Hồi, E2E phụ thuộc vào nó). `era` lấy từ `year` của Trung.
   - `baseline.minDurationHours = 0` và `minCasualties = 0`: engine v1 của Trung kẹp ở 0 (không phải 12 giờ / 500),
     vì số liệu của các bài này là điểm /100. Nếu không thêm, "50 / 100" bị hiện thành 500.
   - Bài 1 đến 3 không có `simulation`, nên lời nhận xét kết quả dùng chữ trung tính của engine v1 (nay là
     `timelineOutcomes` trong `engine.ts`, áp cho bài theo trục thời gian không khai báo `outcomes`). Bài 4 ghi
     đúng các câu đó vào `simulation.outcomes` (câu "perfect" có `ratingText` của bài).
2. **Cảnh sa bàn Stalingrad (bài 4)**: v1 không có dữ liệu cảnh (chỉ `unitCounts` và màu), nên cảnh v2 được dựng
   mới, chỉ từ các thành phần của Lược đồ 4.4 trong `history_data/bai-4-...md`: hai đường mặt trận 19-11-1942 và
   30-11-1942, hai mũi phản công của Liên Xô, Tập đoàn quân số 6 của Đức bị bao vây, mũi giải vây của Đức bị bẻ gãy.
   Hình học là sơ đồ (đúng như Trung ghi trong `schematicNotice`, nay là `simulation.schematicNotice`, hiện dưới
   sa bàn). Cố ý không vẽ sông Von-ga hay địa danh khác ngoài Lược đồ 4.4 vì không có trong nguồn (script căn cứ cấm "sông Volga", "Kalach"...). Màu phe và
   tên phe lấy từ `factionColors`/`factionNames` của Trung. Không đặt `unitCounts` (tên khoá v1 `sovietPincers`... không
   có nghĩa trong v2), không thêm khung hình camera.
3. **Schema** (`lib/lesson-schema.ts`): `explorationMode`, `timeline`, `reviewFlags`, `sourceCitation`,
   `comparisonMetrics`, `simulation.schematicNotice`; `simulation` và `factions` thành tùy chọn, nhưng bài không ở
   chế độ trục thời gian mà thiếu một trong hai thì bị từ chối. `isTimelineMode`, `MODE_LABELS`, `modeLabel` (nhãn
   chế độ của Trung). `lib/timeline.ts` (các mốc, `sectionProgress`/`chapterAt` chuyển ra khỏi `LessonPage`),
   `lib/comparison.ts` (ba hàng so sánh, dùng `comparisonMetrics`).
4. **Trình phát trục thời gian** (`components/TimelinePlayer.tsx`): React, không nạp three.js. Các mốc `timeline`
   (hoặc các giai đoạn nếu thiếu), nút mốc có `aria-current`, phím mũi tên/Home/End, thanh trượt, nút trước/sau,
   Phát (2,5 giây một mốc, dừng ở cuối, có chọn tốc độ), nhãn chế độ. `Player` chọn giữa `ScenePlayer` (3D) và
   `TimelinePlayer`; id phần tử giữ quy ước `#btn-play-<prefix>`, `#timeline-slider-<prefix>`...
   Khác v1: v1 đọc `item.title/content` nhưng `timeline` của Trung chỉ có `{year, event}` nên thẻ mốc trống; v2 hiện `event`.
   Trang bài học, bước 2 và 4 của vòng 6 bước, bản xem trước trong trình soạn đều đi qua `Player`.
   Thumbnail của bài trục thời gian là dải các mốc (không có bản đồ).
5. **Trình soạn** (commit 75932c7): tab "Sa bàn 3D" đổi thành "Trục thời gian" cho bài trục thời gian: ghi chú chế độ,
   bản xem trước và danh sách mốc sửa được (thêm/xoá/đổi chỗ). `reviewFlags` + `sourceCitation` hiện nguyên văn,
   chỉ đọc, ở đầu trình soạn (`#review-flags-panel`).
6. **Dòng chú thích** (commit 9b7361e): "* Chỉ số là giả định sư phạm minh hoạ, không phải kết luận của sách giáo khoa."
   (`SIMULATION_NOTICE_NOTE` trong `ui.tsx`) dưới thông báo mô phỏng ở màn hình so sánh, cho mọi bài; `check.sh` kiểm tra.
   `comparisonMetrics` đổi tên ba hàng so sánh, thẻ "lần thử trước" và dòng trên bảng học sinh.
7. **Dữ liệu và script**: `history_data/*.md` (bốn trích đoạn SGK). `scripts/check-lesson-grounding.mjs` đọc JSON v2,
   chỉ kiểm bài có đích (`GROUNDING_TARGETS`), vào `check.sh` bước 7 và `npm run audit:grounding`;
   `scripts/verify-all-quotes.mjs` (`audit:quotes`, 27/27 khớp) và `scripts/stats-mc-distribution.mjs` (`audit:mc`,
   phân bố đáp án A 25,8% / B 25,8% / C 22,6% / D 25,8%).
8. **Test**: Vitest (trường mới, `isTimelineMode`, mười bài hợp lệ, hợp đồng riêng cho bốn bài SGK, hàng so sánh,
   hàm mốc), `tests/e2e/lesson-timeline.spec.js` (desktop và phone-360). `tests/atlas/data.test.mjs` bỏ qua bài không
   có `atlasPlaceIds` nhưng vẫn bắt buộc id có mặt phải khớp và vẫn đòi ít nhất 6 bài có liên kết.

## Cố ý không chuyển

- Sa bàn diorama và heightmap (`diorama-*.js`, `scene-map.js`), `quality.js`, header/đăng nhập/theme CSS của v1,
  `scripts/build-lesson-data.mjs` (sinh `lesson-data.js`), `scripts/verify-gate2.mjs`, `archive/`, `tests/verify_*.cjs`,
  test đơn vị v1 và các shim `node.exe` cho Windows. Backend không đổi.
- Biểu đồ và lược đồ của ba chế độ `ussr_charts`, `depression_charts`, `asia_map`: v1 cũng chỉ vẽ trục thời gian
  (nhãn chế độ nhắc "Biểu đồ..." nhưng chưa có biểu đồ). v2 giữ nhãn của Trung và hiện trục thời gian. Chưa làm biểu đồ.
- Ghép mốc `timeline` với `sections`: hai danh sách không có khoá chung. Giai đoạn đang hiện suy ra từ tiến trình
  (`mốc i / (n-1)` so với `timelineRange`), nên ranh giới chỉ gần đúng. Muốn chính xác thì thêm `sectionId` cho mốc (chưa làm).

## Lưu ý cho người duyệt

- Bốn bài chỉ có 1 biến × 2 phương án: `playabilityIssues` vẫn nhắc ở trình soạn, và test 3×3 của S2 chỉ áp cho sáu
  bài đầy đủ (danh sách `SGK_IDS` trong `domain.test.ts`). Chưa bịa thêm biến hay phương án.
- Ngày dạy của bốn bài là 25 đến 28-10-2026, trạng thái "Đã dạy": học sinh thấy ngay. Không ảnh hưởng bài gần nhất
  trên bảng giáo viên (vẫn là Chiến dịch Hồ Chí Minh, bài đã lên lịch gần nhất).
- Trích dẫn của Trung đã được đối chiếu với `history_data/` bằng script, nhưng `history_data/` là bản gõ lại từ sách,
  vẫn cần người đọc đối chiếu với sách in (xem `reviewFlags` của từng bài).
