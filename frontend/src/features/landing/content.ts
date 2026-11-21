export const notice = "Nội dung minh họa, chưa được chuyên gia duyệt";

const museum = "https://baotanglichsu.vn";
const worldHeritage = "https://whc.unesco.org/en/list";

export const sources = {
  dongSon: museum + "/VI/Articles/3101/16033/van-hoa-djong-son-tu-da-su-djen-su-thuc-khao-co-hoc.html",
  trung: museum + "/VI/Articles/3098/13485/cuoc-khoi-nghia-hai-ba-trung-nam-40-43-sau-cong-nguyen.html",
  ngo: museum + "/VI/Articles/3098/13934/ngo-quyen-va-chien-thang-bach-djang-nam-938.html",
  tran: museum + "/VI/Articles/3096/18594/tim-hieu-ve-nhung-chiec-coc-bach-djang-nam-1288-hien-djang-trung-bay-o-bao-tang-lich-su-quoc-gia.html",
  dienBien: museum + "/vi/Articles/2002/67999/tran-quyet-chien-chien-luoc-tieu-diet-tap-djoan-cu-djiem-djien-bien-phu-13-3-7-5-1954-djot-iii-djon-quyet-djinh.html",
  hung: "https://ich.unesco.org/en/Decisions/7.COM/11.36",
  lamSon: museum + "/VI/Articles/3096/75073/di-tich-lam-kinh-bieu-tuong-cua-long-tu-hao-ve-mot-giai-djoan-lich-su-oai-hung-chong-quan-xam-luoc.html",
  thangLong: worldHeritage + "/1328",
  hue: worldHeritage + "/678",
  ho: worldHeritage + "/1358",
  docLap: "https://dinhdoclap.gov.vn/lich-su-dinh-doc-lap/",
  drum: museum + "/vi/Articles/1001/73637/bao-vat-quoc-gia-trong-ngoc-lu.html",
  woodblock: "https://www.unesco.org/en/articles/saving-nguyen-dynasty-woodblocks",
  stakes: museum + "/vi/Articles/1002/28186/coc-bach-djang.html",
  taySon: museum + "/VI/Articles/3091/16409/lich-su-chong-giac-ngoai-xam-qua-trung-bay-tai-bao-tang-lich-su-quan-su.html",
};

export const eras = [
  { start: "Khởi nguyên", years: "Trước năm 179 TCN", short: "Văn Lang, Âu Lạc", title: "Thời đại Hùng Vương và Văn Lang – Âu Lạc", image: "co-loa", caption: "Minh họa thành Cổ Loa", text: "Truyền thuyết kể về các Vua Hùng dựng nước Văn Lang. Ở Cổ Loa, những lớp thành đất và dấu tích khảo cổ giúp chúng ta tìm hiểu về trung tâm của nước Âu Lạc.", detail: "Khảo cổ học Đông Sơn ghi nhận nghề đúc đồng phát triển ở các lưu vực sông Hồng, sông Mã và sông Cả. Các mốc của thời dựng nước còn được diễn giải khác nhau giữa truyền thuyết, thư tịch và khảo cổ.", source: sources.dongSon },
  { start: "179 TCN", years: "179 TCN – 938", short: "Bắc thuộc", title: "Thời kỳ Bắc thuộc và các cuộc khởi nghĩa", image: "hai-ba", caption: "Tái hiện nghệ thuật cuộc khởi nghĩa Hai Bà Trưng", text: "Nhiều thế kỷ dưới các chính quyền phương Bắc chứng kiến những cuộc nổi dậy và những giai đoạn tự chủ. Khởi nghĩa Hai Bà Trưng bùng nổ năm 40.", detail: "Từ Hai Bà Trưng, Bà Triệu đến Lý Bí và Khúc Thừa Dụ, những nỗ lực giành quyền tự chủ diễn ra qua nhiều thế kỷ. Năm 938, Ngô Quyền đánh bại quân Nam Hán trên sông Bạch Đằng.", source: sources.trung },
  { start: "939", years: "939 – 1009", short: "Ngô, Đinh, Tiền Lê", title: "Ngô – Đinh – Tiền Lê", image: "hoa-lu", caption: "Minh họa cố đô Hoa Lư", text: "Sau chiến thắng Bạch Đằng, Ngô Quyền xưng vương và định đô ở Cổ Loa. Đinh Bộ Lĩnh thống nhất đất nước, lập nước Đại Cồ Việt và đóng đô ở Hoa Lư.", detail: "Tiếp nối nhà Đinh, Lê Hoàn lên ngôi năm 980. Hoa Lư tiếp tục là trung tâm quyền lực cho đến khi Lý Công Uẩn dời đô.", source: sources.ngo },
  { start: "1009", years: "1009 – 1225", short: "Nhà Lý", title: "Nhà Lý", image: "thang-long", caption: "Minh họa Hoàng thành Thăng Long", text: "Năm 1010, Lý Công Uẩn dời đô từ Hoa Lư ra Đại La, đổi tên thành Thăng Long. Kinh đô mới trở thành trung tâm chính trị và văn hóa của Đại Việt.", detail: "Văn Miếu được lập năm 1070. Việc xây dựng các thiết chế học tập và sự phát triển của Phật giáo để lại dấu ấn rõ nét trong đời sống thời Lý.", source: sources.thangLong },
  { start: "1225", years: "1225 – 1400", short: "Nhà Trần", title: "Nhà Trần", image: "bach-dang-1288", caption: "Tái hiện nghệ thuật sông Bạch Đằng", text: "Đại Việt thời Trần ba lần chống quân Mông – Nguyên. Chiến thắng Bạch Đằng năm 1288 là một dấu mốc của cuộc kháng chiến lần thứ ba.", detail: "Di sản nhà Trần còn in dấu trong văn hóa và tư tưởng, trong đó có thiền phái Trúc Lâm gắn với Trần Nhân Tông.", source: sources.tran },
  { start: "1400", years: "1400 – 1427", short: "Nhà Hồ, Lam Sơn", title: "Nhà Hồ và khởi nghĩa Lam Sơn", image: "thanh-nha-ho", caption: "Minh họa thành nhà Hồ", text: "Nhà Hồ lập nước Đại Ngu năm 1400. Sau khi nhà Minh chiếm Đại Việt, Lê Lợi dựng cờ khởi nghĩa ở Lam Sơn năm 1418.", detail: "Khởi nghĩa Lam Sơn kéo dài khoảng một thập niên. Sau thắng lợi năm 1427, Lê Lợi lên ngôi vào năm sau, mở đầu thời Lê sơ.", source: sources.lamSon },
  { start: "1428", years: "1428 – 1527", short: "Nhà Lê sơ", title: "Nhà Lê sơ", image: "lam-kinh", caption: "Minh họa khu di tích Lam Kinh", text: "Từ năm 1428, nhà Lê sơ củng cố bộ máy quản lý và phát triển khoa cử. Dưới thời Lê Thánh Tông, triều đình đẩy mạnh pháp luật và tổ chức hành chính.", detail: "Quốc triều hình luật và bia tiến sĩ ở Văn Miếu là những dấu tích cho thấy triều đình coi trọng cả luật pháp lẫn việc tuyển chọn nhân tài.", source: sources.thangLong },
  { start: "1527", years: "Thế kỷ XVI – 1802", short: "Trịnh, Nguyễn, Tây Sơn", title: "Trịnh – Nguyễn và Tây Sơn", image: "tay-son", caption: "Minh họa di tích gắn với Tây Sơn", text: "Sau thời Nam – Bắc triều, các chúa Trịnh và Nguyễn cai quản hai vùng Đàng Ngoài, Đàng Trong. Phong trào Tây Sơn nổi lên từ năm 1771.", detail: "Năm 1789, Quang Trung chỉ huy quân Tây Sơn đánh bại quân Thanh trong chiến dịch Ngọc Hồi – Đống Đa. Năm 1802, Nguyễn Ánh lập nhà Nguyễn.", source: sources.taySon },
  { start: "1802", years: "1802 – 1945", short: "Nhà Nguyễn", title: "Nhà Nguyễn", image: "hue", caption: "Minh họa Kinh thành Huế", text: "Gia Long lập nhà Nguyễn năm 1802 và đặt kinh đô ở Huế. Triều Nguyễn để lại quần thể kiến trúc cung đình, lăng tẩm và khối lượng lớn tư liệu hành chính.", detail: "Triều đại tồn tại đến năm 1945. Từ giữa thế kỷ XIX, lịch sử triều Nguyễn diễn ra đồng thời với quá trình Pháp xâm lược và thiết lập chế độ thuộc địa.", source: sources.hue },
  { start: "1858", years: "1858 – 1945", short: "Thời thuộc địa", title: "Thời kỳ thuộc địa và đấu tranh giành độc lập", image: "hoa-lo", caption: "Minh họa di tích Nhà tù Hỏa Lò", text: "Cuộc tấn công Đà Nẵng năm 1858 mở đầu quá trình Pháp xâm lược. Trong nhiều thập niên, các phong trào đấu tranh giành độc lập diễn ra theo nhiều khuynh hướng.", detail: "Từ phong trào Cần Vương đến Đông Du và những tổ chức cách mạng thế kỷ XX, các lực lượng theo đuổi những con đường khác nhau. Cách mạng Tháng Tám năm 1945 mở đường cho sự ra đời của nước Việt Nam Dân chủ Cộng hòa.", source: sources.docLap },
  { start: "1945", years: "Từ năm 1945", short: "Việt Nam hiện đại", title: "Việt Nam từ năm 1945 đến nay", image: "doc-lap", caption: "Minh họa Dinh Độc Lập", text: "Ngày 2/9/1945, nước Việt Nam Dân chủ Cộng hòa ra đời. Sau các cuộc chiến tranh, đất nước thống nhất về mặt nhà nước năm 1976 và bước vào công cuộc Đổi mới từ năm 1986.", detail: "Việt Nam gia nhập ASEAN năm 1995. Từ chiến tranh, tái thiết đến mở cửa và hội nhập, mỗi giai đoạn đặt ra những câu hỏi khác nhau về cách đất nước thay đổi.", source: sources.docLap },
];

export const stories = [
  { year: "40", place: "Mê Linh", title: "Khởi nghĩa Hai Bà Trưng", image: "hai-ba", text: "Năm 40, Trưng Trắc và Trưng Nhị phát động khởi nghĩa chống chính quyền Đông Hán. Cuộc nổi dậy lan rộng, Trưng Trắc được suy tôn làm vua và đặt trung tâm ở Mê Linh.", detail: "Cuộc khởi nghĩa bị đàn áp vào năm 43. Qua nhiều thế kỷ, ký ức về Hai Bà được lưu giữ trong tục thờ, đền thờ và lễ hội ở nhiều địa phương.", source: sources.trung },
  { year: "938", place: "Sông Bạch Đằng", title: "Chiến thắng Bạch Đằng", image: "bach-dang-938", text: "Trên cửa sông Bạch Đằng, Ngô Quyền đánh bại quân Nam Hán năm 938. Thắng lợi giúp chấm dứt nguy cơ tái lập ách đô hộ và mở đường cho một thời kỳ tự chủ lâu dài.", detail: "Năm sau, Ngô Quyền xưng vương, chọn Cổ Loa làm kinh đô. Cổ Loa từ đó gắn với hai giai đoạn cách nhau nhiều thế kỷ của lịch sử Việt Nam.", source: sources.ngo },
  { year: "1288", place: "Sông Bạch Đằng", title: "Bạch Đằng thời Trần", image: "bach-dang-1288", text: "Ba thế kỷ rưỡi sau, Bạch Đằng lại chứng kiến một chiến thắng. Quân Đại Việt dưới thời Trần đánh bại đoàn thuyền quân Nguyên đang rút lui.", detail: "Những bãi cọc được khảo sát ở vùng cửa sông hôm nay mở ra cách đọc sự kiện từ hiện vật. Việc xác định niên đại và vai trò của từng bãi cọc vẫn cần đối chiếu khảo cổ.", source: sources.tran },
  { year: "1954", place: "Mường Thanh, Điện Biên", title: "Chiến thắng Điện Biên Phủ", image: "dien-bien", text: "Ngày 7/5/1954, chiến dịch Điện Biên Phủ kết thúc sau gần hai tháng giao tranh. Thắng lợi có ảnh hưởng lớn đến tiến trình đàm phán tại Hội nghị Genève.", detail: "Dấu tích ở lòng chảo Mường Thanh và ảnh lưu trữ về dân công, vận tải, quân y giúp nhìn lại chiến dịch qua cả đời sống của những người tham gia.", source: sources.dienBien },
];

export const figures = [
  { name: "Hai Bà Trưng", period: "Thế kỷ I", image: "person-trung", bio: "Trưng Trắc và Trưng Nhị lãnh đạo cuộc khởi nghĩa năm 40 chống chính quyền Đông Hán. Trưng Trắc được suy tôn làm vua, lập trung tâm ở Mê Linh.", source: sources.trung },
  { name: "Ngô Quyền", period: "898 – 944", image: "person-ngo", bio: "Lãnh đạo chiến thắng Bạch Đằng năm 938. Ông xưng vương năm 939 và chọn Cổ Loa làm nơi đóng đô.", source: sources.ngo },
  { name: "Trần Hưng Đạo", period: "Thế kỷ XIII", image: "person-tran", bio: "Trần Quốc Tuấn là Quốc công Tiết chế thời Trần, giữ vai trò quan trọng trong các cuộc kháng chiến chống Nguyên – Mông, đặc biệt ở Bạch Đằng năm 1288.", source: sources.tran },
  { name: "Lê Lợi", period: "1385 – 1433", image: "person-le", bio: "Lãnh đạo khởi nghĩa Lam Sơn từ năm 1418. Sau khi quân Minh rút, ông lên ngôi năm 1428, mở đầu triều Lê sơ.", source: sources.lamSon },
  { name: "Quang Trung", period: "Thế kỷ XVIII", image: "person-quang", bio: "Nguyễn Huệ là một trong những thủ lĩnh Tây Sơn. Ông lên ngôi năm 1788 và lãnh đạo cuộc tiến quân đánh bại quân Thanh vào đầu năm 1789.", source: sources.taySon },
  { name: "Hồ Chí Minh", period: "1890 – 1969", image: "ho-chi-minh", archive: true, bio: "Ngày 2/9/1945, Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập tại quảng trường Ba Đình, công bố sự ra đời của nước Việt Nam Dân chủ Cộng hòa.", source: "https://commons.wikimedia.org/wiki/File:Ho_Chi_Minh_1946.jpg" },
];

export const places = [
  { id: "den-hung", title: "Khu di tích Đền Hùng", region: "Phú Thọ", image: "den-hung", lat: 21.36553, lon: 105.32463, text: "Quần thể đền trên núi Nghĩa Lĩnh gắn với tín ngưỡng thờ cúng Hùng Vương. Giỗ Tổ được tổ chức vào ngày 10 tháng 3 âm lịch.", source: sources.hung },
  { id: "thang-long", title: "Hoàng thành Thăng Long", region: "Hà Nội", image: "thang-long", lat: 21.0325, lon: 105.83972, text: "Những lớp di tích và di vật khảo cổ ghi lại lịch sử của trung tâm quyền lực ở Thăng Long qua nhiều triều đại. UNESCO ghi danh khu trung tâm năm 2010.", source: sources.thangLong },
  { id: "hue", title: "Cố đô Huế", region: "Huế", image: "hue", lat: 16.46972, lon: 107.57778, text: "Quần thể kiến trúc gắn với kinh đô triều Nguyễn gồm thành quách, cung điện, lăng tẩm và những công trình nghi lễ.", source: sources.hue },
  { id: "thanh-nha-ho", title: "Thành nhà Hồ", region: "Thanh Hóa", image: "thanh-nha-ho", lat: 20.07806, lon: 105.60472, text: "Tòa thành xây năm 1397 nổi bật với những cổng đá ghép khối lớn. Di sản còn gồm La Thành và đàn tế Nam Giao.", source: sources.ho },
  { id: "dien-bien-phu", title: "Khu di tích Điện Biên Phủ", region: "Điện Biên", image: "dien-bien-di-tich", lat: 21.38694, lon: 103.01556, text: "Những địa điểm như đồi A1 và khu trung tâm Mường Thanh lưu giữ dấu tích của chiến dịch kết thúc ngày 7/5/1954.", source: sources.dienBien },
  { id: "dinh-doc-lap", title: "Dinh Độc Lập", region: "TP. Hồ Chí Minh", image: "doc-lap", lat: 10.77705, lon: 106.69537, text: "Công trình gắn với lịch sử Sài Gòn thế kỷ XX và thời điểm kết thúc Chiến dịch Hồ Chí Minh ngày 30/4/1975.", source: sources.docLap },
];

export const artifacts = [
  { title: "Trống đồng Ngọc Lũ", type: "Đồ đồng Đông Sơn", image: "drum", text: "Trên mặt trống, các vòng hoa văn bao quanh ngôi sao nhiều cánh. Hình người, chim và thuyền là những chi tiết giúp tìm hiểu mỹ thuật và đời sống cư dân Đông Sơn.", source: sources.drum, credit: "Ảnh VuThiAnh · Phạm vi công cộng", creditUrl: "https://commons.wikimedia.org/wiki/File:Ngoc_Lu.jpg" },
  { title: "Mộc bản triều Nguyễn", type: "Di sản tư liệu", image: "woodblock", text: "Chữ được khắc ngược trên ván gỗ để khi in có thể đọc theo chiều thuận. Những mộc bản này lưu giữ nhiều bộ sách về chính sử, địa lý và văn chương.", source: sources.woodblock, credit: "Ảnh Diane Selwyn · CC BY-SA 3.0", creditUrl: "https://commons.wikimedia.org/wiki/File:Woodblocks_of_the_Nguy%E1%BB%85n_Dynasty_01.jpg", license: "https://creativecommons.org/licenses/by-sa/3.0/" },
  { title: "Ngọ Môn", type: "Kiến trúc cung đình", image: "gate", text: "Cổng chính phía nam của Hoàng thành Huế có lầu Ngũ Phụng ở phía trên. Hình dáng mái và bố cục cổng phản ánh vai trò nghi lễ của công trình trong kinh đô.", source: sources.hue, credit: "Ảnh Supanut Arunoprayote · CC BY 4.0", creditUrl: "https://commons.wikimedia.org/wiki/File:Meridian_Gate,_Hue_(I).jpg", license: "https://creativecommons.org/licenses/by/4.0/" },
  { title: "Cọc Bạch Đằng", type: "Dấu tích khảo cổ", image: "stakes", text: "Những cọc gỗ tìm thấy ở vùng sông Bạch Đằng là tư liệu vật chất để đối chiếu với sử liệu về trận thủy chiến thời Trần.", source: sources.stakes, credit: "Ảnh Bùi Thụy Đào Nguyên · CC BY-SA 3.0", creditUrl: "https://commons.wikimedia.org/wiki/File:C%E1%BB%8Dc_B%E1%BA%A1ch_%C4%90%E1%BA%B1ng.jpg", license: "https://creativecommons.org/licenses/by-sa/3.0/" },
];

export const questions = [
  { title: "Khởi nghĩa Hai Bà Trưng bắt đầu vào năm nào?", choices: ["Năm 40", "Năm 248", "Năm 542"], correct: 0, note: "Trưng Trắc và Trưng Nhị phát động cuộc khởi nghĩa chống chính quyền Đông Hán vào năm 40.", source: sources.trung },
  { title: "Ai lãnh đạo chiến thắng Bạch Đằng năm 938?", choices: ["Trần Hưng Đạo", "Ngô Quyền", "Lê Hoàn"], correct: 1, note: "Ngô Quyền đánh bại quân Nam Hán năm 938. Trần Hưng Đạo gắn với chiến thắng ở Bạch Đằng năm 1288.", source: sources.ngo },
  { title: "Kinh đô của triều Nguyễn đặt ở đâu?", choices: ["Hoa Lư", "Thăng Long", "Huế"], correct: 2, note: "Huế là kinh đô dưới triều Nguyễn từ năm 1802 đến năm 1945.", source: sources.hue },
  { title: "Chiến dịch Điện Biên Phủ kết thúc vào ngày nào?", choices: ["2/9/1945", "7/5/1954", "30/4/1975"], correct: 1, note: "Chiến dịch Điện Biên Phủ kết thúc ngày 7/5/1954, trong thời gian Hội nghị Genève đang diễn ra.", source: sources.dienBien },
];
