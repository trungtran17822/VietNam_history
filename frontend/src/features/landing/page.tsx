import { ArrowUp, ArrowUpRight } from "lucide-react";
import { Artifacts, Figures, HeritageMap, Quiz } from "./exhibits";
import { Brand, Header, Hero, Timeline } from "./journey";
import { Stories } from "./stories";
import { ScrollMotion } from "./scroll-motion";
import { notice, sources } from "./content";

const references = [
  ["Văn hóa Đông Sơn", sources.dongSon],
  ["Hai Bà Trưng", sources.trung],
  ["Bạch Đằng năm 938", sources.ngo],
  ["Bạch Đằng năm 1288", sources.tran],
  ["Điện Biên Phủ năm 1954", sources.dienBien],
  ["Hoàng thành Thăng Long", sources.thangLong],
  ["Quần thể di tích Cố đô Huế", sources.hue],
  ["Thành nhà Hồ", sources.ho],
  ["Khởi nghĩa Lam Sơn", sources.lamSon],
  ["Trống đồng Ngọc Lũ", sources.drum],
];

export default function Home() {
  return <div id="dau-trang">
    <a className="skip-link" href="#noi-dung">Chuyển đến nội dung</a>
    <Header />
    <main id="noi-dung" tabIndex={-1}>
      <Hero />
      <Timeline />
      <Stories />
      <Figures />
      <HeritageMap />
      <Artifacts />
      <Quiz />
      <section className="closing" aria-labelledby="closing-title">
        <img className="closing-art" src="./landing/media/closing.webp" alt="" loading="lazy" width="1400" height="900" />
        <div className="closing-shade" />
        <div className="shell closing-content">
          <h2 id="closing-title">LỊCH SỬ KHÔNG CHỈ ĐỂ NHỚ.<br />LỊCH SỬ ĐỂ HIỂU.</h2>
          <a href="#nien-bieu" className="button gold">Khám phá lịch sử Việt Nam <ArrowUpRight size={18} aria-hidden="true" /></a>
        </div>
        <p className="closing-caption">Tam Cốc, Ninh Bình · Minh họa nghệ thuật</p>
      </section>
    </main>
    <footer className="footer" id="nguon">
      <div className="shell">
        <div className="footer-grid">
          <div>
            <Brand />
            <p>Chạm Sử là dự án học lịch sử qua bài giảng, sa bàn tương tác và atlas di sản dành cho lớp học.</p>
            <a className="text-link" href="./classroom.html">Mở lớp học Chạm Sử <ArrowUpRight size={15} aria-hidden="true" /></a>
          </div>
          <div>
            <h2>Khám phá</h2>
            <ul>
              <li><a href="#nien-bieu">Dòng thời gian</a></li>
              <li><a href="#cau-chuyen">Câu chuyện</a></li>
              <li><a href="#di-san">Bản đồ di sản</a></li>
              <li><a href="#hien-vat">Phòng trưng bày</a></li>
              <li><a href="#thu-suc">Thử sức</a></li>
            </ul>
          </div>
          <div className="references">
            <h2>Nguồn tham khảo</h2>
            <p>Bảo tàng Lịch sử Quốc gia và Trung tâm Di sản Thế giới UNESCO.</p>
            <ul>{references.map(([title, url]) => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer">{title} <ArrowUpRight size={13} aria-hidden="true" /></a></li>)}</ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Chạm Sử <span>·</span> {notice}</p>
          <a href="#dau-trang" className="text-link">Về đầu trang <ArrowUp size={15} aria-hidden="true" /></a>
        </div>
      </div>
    </footer>
    <ScrollMotion />
  </div>;
}
