import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowUpRight, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { eras, notice } from "./content";

export const navigation = [
  { id: "nien-bieu", label: "Dòng thời gian" },
  { id: "cau-chuyen", label: "Câu chuyện" },
  { id: "nhan-vat", label: "Nhân vật" },
  { id: "di-san", label: "Di sản" },
];

export function Brand() {
  return <a href="#dau-trang" className="brand">
    <img src="./assets/logo/logo-transparent.png" alt="" width="42" height="42" />
    <span>Sử Việt</span>
  </a>;
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const toggle = useRef<HTMLButtonElement>(null);
  const progress = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const sections = [...navigation.map(({ id }) => id), "thu-suc"]
      .map(id => document.getElementById(id)).filter(section => section !== null);
    let frame = 0;
    const update = () => {
      setScrolled(window.scrollY > 36);
      const line = Math.min(window.innerHeight * .33, 230);
      const section = sections.findLast(item => item.getBoundingClientRect().top <= line);
      setActive(section?.id ?? "");
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      const fraction = distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0;
      progress.current?.style.setProperty("--reading-progress", String(fraction));
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return <header className={`site-header ${scrolled || open ? "is-solid" : ""}`} onKeyDown={event => {
    if (event.key === "Escape" && open) {
      setOpen(false);
      toggle.current?.focus();
    }
  }}>
    <div className="notice">{notice}</div>
    <div className="shell nav-inner">
      <Brand />
      <button ref={toggle} className="menu-toggle icon-button" type="button" aria-controls="navigation" aria-expanded={open}
        aria-label={open ? "Đóng menu" : "Mở menu"} onClick={() => setOpen(!open)}>
        {open ? <X size={23} /> : <Menu size={23} />}
      </button>
      <nav id="navigation" aria-label="Điều hướng chính" className={`navigation ${open ? "is-open" : ""}`}>
        {navigation.map(({ id, label }) => <a key={id} href={`#${id}`} onClick={() => setOpen(false)}
          aria-current={active === id ? "location" : undefined}>{label}</a>)}
        <a href="#thu-suc" className="nav-quiz" aria-current={active === "thu-suc" ? "location" : undefined}
          onClick={() => setOpen(false)}>Thử sức</a>
        <a href="./classroom.html" className="nav-classroom">Vào lớp học <ArrowUpRight size={15} aria-hidden="true" /></a>
      </nav>
    </div>
    <span ref={progress} className="reading-progress" aria-hidden="true" />
  </header>;
}

export function Hero() {
  return <section className="hero" aria-labelledby="hero-title">
    <picture className="hero-picture" aria-hidden="true">
      <source media="(max-width: 680px)" srcSet="./landing/media/hero-portrait.webp" />
      <img className="hero-image" src="./landing/media/hero.webp" alt="" fetchPriority="high" width="1704" height="1005" />
    </picture>
    <div className="hero-shade" />
    <div className="hero-aperture" aria-hidden="true" />
    <div className="shell hero-content">
      <div className="hero-copy">
        <h1 id="hero-title" className="hero-title" aria-label="Việt Nam. Ngàn năm sử Việt">
          <span className="hero-main">VIỆT NAM</span>
          <span className="hero-subtitle">NGÀN NĂM SỬ VIỆT</span>
        </h1>
        <p className="hero-lead">Mỗi trang sử là một câu chuyện.<br />{" "}Mỗi thời đại là một dấu ấn không thể phai mờ.</p>
        <div className="actions">
          <a className="button gold" href="#nien-bieu">Bắt đầu hành trình <ArrowDown size={17} aria-hidden="true" /></a>
          <a className="button ghost" href="#cac-moc">Khám phá dòng thời gian</a>
        </div>
      </div>
    </div>
    <div className="shell hero-bottom">
      <a href="#nien-bieu" className="scroll-indicator"><span><ArrowDown size={15} aria-hidden="true" /></span>Cuộn để khám phá</a>
      <p>Ngọ Môn, Huế <span className="hero-separator">·</span> <span className="hero-meta">Tái hiện nghệ thuật</span></p>
    </div>
  </section>;
}

export function SectionHeading({ id, title, description, children }: {
  id: string; title: string; description?: string; children?: ReactNode;
}) {
  return <div className="section-heading">
    <h2 id={id}>{title}</h2>
    {description && <p>{description}</p>}
    {children}
  </div>;
}

export function Source({ href, children = "Đọc tư liệu" }: { href: string; children?: ReactNode }) {
  return <a className="text-link" href={href} target="_blank" rel="noopener noreferrer">
    {children} <ArrowUpRight size={15} aria-hidden="true" />
  </a>;
}

export function Timeline() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const reduce = useReducedMotion();
  const rail = useRef<HTMLDivElement>(null);
  const period = eras[index];

  function select(next: number, focus = false) {
    if (next < 0 || next >= eras.length) return;
    setDirection(next >= index ? 1 : -1);
    if (next !== index) setExpanded(false);
    setIndex(next);
    const scroller = rail.current;
    const button = scroller?.querySelector<HTMLButtonElement>(`#era-${next}`);
    if (scroller && button) {
      const offset = button.offsetLeft - (scroller.clientWidth - button.offsetWidth) / 2;
      scroller.scrollTo({ left: offset, behavior: reduce ? "instant" : "smooth" });
      if (focus) button.focus({ preventScroll: true });
    }
  }

  function onKey(event: KeyboardEvent<HTMLButtonElement>) {
    const targets: Record<string, number> = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: eras.length - 1 };
    const target = targets[event.key];
    if (target === undefined) return;
    event.preventDefault();
    select(target, true);
  }

  return <section className="section paper timeline" id="nien-bieu" aria-labelledby="timeline-title">
    <div className="shell">
      <SectionHeading id="timeline-title" title="Dòng thời gian" description="Từ dấu tích dựng nước đến Việt Nam hôm nay. Chọn một mốc để mở trang sử của thời đại ấy." />
      <div className="timeline-controls" id="cac-moc">
        <span className="count" aria-live="polite">Thời đại {index + 1} / {eras.length}</span>
        <div className="paired-controls">
          <button type="button" className="icon-button" onClick={() => select(index - 1)} disabled={index === 0} aria-label="Thời đại trước"><ChevronLeft size={22} /></button>
          <button type="button" className="icon-button" onClick={() => select(index + 1)} disabled={index === eras.length - 1} aria-label="Thời đại sau"><ChevronRight size={22} /></button>
        </div>
      </div>
      <div className="era-rail" role="tablist" aria-label="Các thời đại" ref={rail}>
        {eras.map((era, number) => <button type="button" key={era.start} role="tab" id={`era-${number}`}
          aria-controls="era-panel" aria-selected={index === number} tabIndex={index === number ? 0 : -1}
          onKeyDown={onKey} onClick={() => select(number)}>
          <b>{era.start}</b><span>{era.short}</span>
        </button>)}
      </div>
      <div className="era-progress" aria-hidden="true"><span style={{ transform: `scaleX(${(index + 1) / eras.length})` }} /></div>
      <div className="era-panel" id="era-panel" role="tabpanel" tabIndex={0} aria-labelledby={`era-${index}`}>
        <AnimatePresence initial={false} mode="wait" custom={direction}>
          <motion.article className="era-page" key={period.start} custom={direction} variants={{
            enter: { opacity: .65 },
            center: { opacity: 1, transition: { duration: reduce ? 0 : .26, ease: "easeOut" } },
            exit: { opacity: 0, transition: { duration: reduce ? 0 : .14, ease: "easeIn" } },
          }} initial={reduce ? false : "enter"} animate="center" exit={reduce ? undefined : "exit"}>
            <motion.figure className="era-figure" custom={direction} variants={{
              enter: (sign: number) => ({
                clipPath: sign > 0 ? "inset(0 26% 0 0)" : "inset(0 0 0 26%)",
              }),
              center: { clipPath: "inset(0 0 0 0)", transition: { duration: reduce ? 0 : .43, ease: [.16, 1, .3, 1] } },
            }}>
              <img src={`./landing/media/${period.image}.webp`} alt={period.caption} loading="lazy" width="850" height="540" />
              <figcaption>{period.caption}</figcaption>
            </motion.figure>
            <div className="era-copy">
              <div className="era-date">{period.years}</div>
              <h3>{period.title}</h3>
              <p>{period.text}</p>
              <button type="button" className="text-link" aria-expanded={expanded} aria-controls="era-more" onClick={() => setExpanded(!expanded)}>
                {expanded ? "Thu gọn" : "Khám phá thời đại"} <ChevronRight size={16} className={expanded ? "turn" : ""} aria-hidden="true" />
              </button>
              <div id="era-more" hidden={!expanded} className="era-more"><p>{period.detail}</p><Source href={period.source} /></div>
            </div>
          </motion.article>
        </AnimatePresence>
      </div>
    </div>
  </section>;
}
