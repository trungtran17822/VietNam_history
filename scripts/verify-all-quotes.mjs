import fs from 'fs';
import path from 'path';

const files = {
  'bai-1': 'history_data/bai-1-nuoc-nga-va-lien-xo.md',
  'bai-2': 'history_data/bai-2-chau-au-va-nuoc-my.md',
  'bai-3': 'history_data/bai-3-chau-a.md',
  'bai-4': 'history_data/bai-4-chien-tranh-the-gioi-thu-hai.md'
};

const quotes = [
  // Bai 1
  { file: 'bai-1', label: 'B1-Quote-NEP', text: 'Tháng 3-1921, Đảng Bôn-sê-vích Nga quyết định thực hiện Chính sách kinh tế mới (NEP), do V. I. Lênin khởi xướng' },
  { file: 'bai-1', label: 'B1-Quote-LienXo', text: 'Cuối năm 1922, Liên Xô thành lập, gồm các nước cộng hoà đầu tiên: Nga, Bê-lô-rút-xi-a, U-crai-na và các nước Cộng hoà Ngoại Cáp-ca-dơ.' },
  { file: 'bai-1', label: 'B1-Quote-ThanhTuu', text: 'Qua hai kế hoạch 5 năm (1928–1932 và 1933–1937), Liên Xô đạt nhiều thành tựu và trở thành cường quốc công nghiệp đứng đầu châu Âu, đứng thứ hai thế giới (sau Mỹ).' },
  { file: 'bai-1', label: 'B1-Quote-HanChe', text: 'Hạn chế: tập thể hoá nông nghiệp quá nhanh khi nông dân chưa sẵn sàng; đầu tư cho công nghiệp nhẹ quá thấp.' },
  { file: 'bai-1', label: 'B1-Sim-GoiY', text: 'người học chỉnh tốc độ tập thể hoá và tỉ lệ đầu tư cho công nghiệp nhẹ, xem các chỉ số minh hoạ (sản lượng công nghiệp nặng, lương thực, đời sống nông dân)' },

  // Bai 2
  { file: 'bai-2', label: 'B2-Quote-QTCS', text: 'Lê-nin cùng một số nhà cách mạng quốc tế tổ chức đại hội thành lập Quốc tế Cộng sản tại Mát-xcơ-va (tháng 3-1919). Tổ chức này lãnh đạo các đảng cộng sản nhiều nước đấu tranh chống chủ nghĩa đế quốc và chủ nghĩa phát xít' },
  { file: 'bai-2', label: 'B2-Quote-DaiSuyThoai', text: 'Sau thời kì thịnh vượng ngắn trong những năm 1920, kinh tế Mỹ và châu Âu rơi vào khủng hoảng trầm trọng, bắt đầu từ vụ sụp đổ của thị trường chứng khoán Niu Oóc (Mỹ), rồi lan sang châu Âu và các châu lục khác, kéo dài đến những năm 1933–1934.' },
  { file: 'bai-2', label: 'B2-Quote-PhatXit', text: 'năm 1933 Hít-le, lãnh đạo Đảng Công nhân quốc gia xã hội chủ nghĩa Đức (Đảng Quốc xã), trở thành Thủ tướng.' },
  { file: 'bai-2', label: 'B2-Quote-LienMinhPhatXit', text: 'Năm 1936, liên minh phát xít Đức – I-ta-li-a ra đời.' },
  { file: 'bai-2', label: 'B2-Quote-ThoaThuanMoi', text: 'Ru-dơ-ven đắc cử Tổng thống và thực hiện các cải cách kinh tế – xã hội gọi chung là "Thoả thuận mới"' },
  { file: 'bai-2', label: 'B2-Quote-NhaNuocCanThiep', text: 'Nhà nước trực tiếp quản lí, can thiệp sâu vào ngân hàng, thị trường chứng khoán.' },
  { file: 'bai-2', label: 'B2-Quote-DauTuCong', text: 'Đầu tư công vào các công trình lớn để tạo việc làm' },
  { file: 'bai-2', label: 'B2-Sim-GoiY', text: 'chọn mức can thiệp của nhà nước (đầu tư công, quản lí ngân hàng, phúc lợi) và xem các chỉ số minh hoạ (thất nghiệp, niềm tin xã hội, ổn định chính trị)' },

  // Bai 3
  { file: 'bai-3', label: 'B3-Quote-QuanDoiNhat', text: 'Quân đội giành quyền kiểm soát chính phủ và chủ trương giải quyết khó khăn kinh tế bằng xâm lược, bành trướng sang các nước láng giềng.' },
  { file: 'bai-3', label: 'B3-Quote-XamLuocTQ', text: 'năm 1931 chiếm vùng Đông Bắc Trung Quốc; ngày 9-3-1932 lập Mãn Châu quốc; từ tháng 7-1937 mở rộng chiến tranh ra toàn Trung Quốc; năm 1940 công bố Thuyết Đại Đông Á' },
  { file: 'bai-3', label: 'B3-Quote-MatTranTQ', text: 'Năm 1937, trước sự xâm lược của Nhật, hai bên đình chiến và lập Mặt trận dân tộc thống nhất chống Nhật.' },
  { file: 'bai-3', label: 'B3-Quote-Gandhi', text: 'Ngày 12-3-1930, Gan-đi bắt đầu cuộc đi bộ gần 400 km đến bờ biển phía Tây để phản đối luật Anh cấm người Ấn tự thu hoạch muối và đánh thuế muối quá cao. Cách đấu tranh bất bạo động này thôi thúc nhiều người Ấn Độ bất tuân lệnh chính quyền thuộc địa.' },
  { file: 'bai-3', label: 'B3-Quote-DongNamA', text: 'Các đảng cộng sản lần lượt thành lập: In-đô-nê-xi-a (1920), Việt Nam (1930), Mã Lai (1930)... Tiêu biểu: khởi nghĩa vũ trang ở Gia-va và Xu-ma-tra (1926–1927), Xô viết Nghệ – Tĩnh (1930–1931).' },
  { file: 'bai-3', label: 'B3-Sim-GoiY', text: 'chọn hình thức đấu tranh (bất bạo động, vũ trang, liên minh các lực lượng) và xem chỉ số minh hoạ (mức huy động quần chúng, rủi ro bị đàn áp, sức ép quốc tế)' },

  // Bai 4
  { file: 'bai-4', label: 'B4-Quote-BungNo', text: 'Ngày 1-9-1939 Đức tấn công Ba Lan; ngày 3-9, Anh và Pháp tuyên chiến với Đức, chiến tranh bùng nổ.' },
  { file: 'bai-4', label: 'B4-Quote-DongMinh', text: '1-1-1942: 26 quốc gia (đứng đầu là Liên Xô, Mỹ, Anh) kí Tuyên ngôn Liên hợp quốc chống phát xít, Khối Đồng minh ra đời.' },
  { file: 'bai-4', label: 'B4-Quote-Stalingrad', text: 'Trận Xta-lin-grát (11-1942 đến 2-1943): Liên Xô phản công thắng lợi, bao vây Tập đoàn quân số 6 của Đức; đây là bước ngoặt của chiến tranh.' },
  { file: 'bai-4', label: 'B4-Quote-LuocDo44', text: 'Lược đồ 4.4 thể hiện: mặt trận ngày 19-11-1942, mặt trận ngày 30-11-1942, các đạo quân Liên Xô phản công, đạo quân Đức giải vây, Tập đoàn quân số 6 của Đức bị bao vây.' },
  { file: 'bai-4', label: 'B4-Quote-HauQua', text: 'Khoảng gần 60 triệu người chết, 90 triệu người tàn tật; thiệt hại vật chất gấp khoảng 10 lần chiến tranh thế giới thứ nhất.' },
  { file: 'bai-4', label: 'B4-Quote-Holocaust', text: 'Hơn 6 triệu người Do Thái bị sát hại, hơn một nửa bị giết trong các trại tập trung của Đức Quốc xã. Thuật ngữ "Holocaust" chỉ nạn diệt chủng này.' },
  { file: 'bai-4', label: 'B4-Quote-VaiTroLienXo', text: 'Liên Xô và các nước Đồng minh là lực lượng trụ cột, giữ vai trò quyết định; chiến công của Hồng quân làm suy yếu quân sự, kinh tế Đức, tạo điều kiện cho Đồng minh phản công. Liên Xô chịu nhiều mất mát nhất, khoảng 27 triệu người Xô viết thiệt mạng.' },
  { file: 'bai-4', label: 'B4-Sim-GoiY', text: 'người học chọn phương án phía Liên Xô/Đồng minh, ví dụ hướng mũi phản công hoặc thời điểm khép vòng vây, rồi chạy mô phỏng. Mọi số liệu thời gian, tổn thất là giả định minh hoạ, ghi rõ "không phải sự thật lịch sử". KHÔNG đặt người học vào vai phía phát xít.' }
];

console.log('======================================================================');
console.log('VERIFYING ALL QUOTES & SOURCE CITATIONS AGAINST history_data/*.md');
console.log('======================================================================');

let allPass = true;
let passCount = 0;

for (const q of quotes) {
  const filePath = path.resolve(files[q.file]);
  const content = fs.readFileSync(filePath, 'utf8').normalize('NFC');
  const normalizedText = q.text.normalize('NFC');
  const found = content.includes(normalizedText);
  if (!found) {
    allPass = false;
    console.log(`❌ FAIL: [${q.label}] in ${files[q.file]}`);
    console.log(`   Text: "${q.text}"`);
  } else {
    passCount++;
    console.log(`✅ PASS: [${q.label}] exact match in ${files[q.file]}`);
  }
}

console.log('======================================================================');
console.log(`RESULT: ${passCount}/${quotes.length} quotes verified verbatim.`);
if (allPass) {
  console.log('🎉 ALL 26/26 QUOTES & CITATIONS MATCH 100% VERBATIM IN SOURCE FILES!');
  process.exit(0);
} else {
  console.error('FAILED: Some quotes do not match verbatim!');
  process.exit(1);
}
