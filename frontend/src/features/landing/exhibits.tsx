import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowUpRight, BookOpen, Check, Compass, MapPin, Minus, Plus, RotateCcw, X } from "lucide-react";
import { artifacts, figures, places, questions } from "./content";
import { SectionHeading, Source } from "./journey";

export function Figures() {
  const [figure, setFigure] = useState<(typeof figures)[number] | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (figure && !dialog.current?.open) dialog.current?.showModal();
  }, [figure]);

  return <section className="section paper" id="nhan-vat" aria-labelledby="figures-title">
    <div className="shell">
      <SectionHeading id="figures-title" title="Những người làm nên lịch sử" description="Mở từng chân dung để đọc về vai trò của nhân vật trong thời đại họ sống." />
      <div className="figure-grid">
        {figures.map(person => <button type="button" className="portrait" key={person.name}
          aria-label={`Đọc tiểu sử ${person.name}`} aria-haspopup="dialog" onClick={() => setFigure(person)}>
          <img src={`./landing/media/${person.image}.webp`} alt="" loading="lazy" width="500" height="490" />
          <span className="portrait-shade" />
          <span className="portrait-type">{person.archive ? "Ảnh tư liệu" : "Minh họa nghệ thuật"}</span>
          <span className="portrait-copy">
            <span className="portrait-era">{person.period}</span>
            <span className="portrait-name">{person.name}</span>
            <span className="portrait-bio" aria-hidden="true">{person.bio}</span>
            <ArrowUpRight className="portrait-open" size={21} aria-hidden="true" />
          </span>
        </button>)}
      </div>
      <dialog ref={dialog} className="profile-dialog" aria-labelledby="profile-title" onClose={() => setFigure(null)}
        onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
        {figure && <div className="profile">
          <button type="button" className="icon-button profile-close" aria-label="Đóng tiểu sử"
            onClick={() => dialog.current?.close()}><X size={23} /></button>
          <figure>
            <img src={`./landing/media/${figure.image}.webp`} alt={`Chân dung ${figure.name}`} width="500" height="490" />
            <figcaption>{figure.archive ? "Khoảng năm 1946 · Wikimedia Commons" : "Chân dung tưởng tượng · Minh họa nghệ thuật"}</figcaption>
          </figure>
          <div className="profile-copy">
            <p className="era-date">{figure.period}</p>
            <h3 id="profile-title">{figure.name}</h3>
            <p>{figure.bio}</p>
            {figure.source && <Source href={figure.source}>{figure.archive ? "Nguồn ảnh tư liệu" : "Đọc tư liệu"}</Source>}
          </div>
        </div>}
      </dialog>
    </div>
  </section>;
}

function project(lon: number, lat: number) {
  return { x: 100 * (lon - 101) / 14.5, y: 100 * (24 - lat) / 16.2 };
}

export function HeritageMap() {
  const [selected, setSelected] = useState(2);
  const [zoom, setZoom] = useState(false);
  const place = places[selected];
  const center = project(place.lon, place.lat);
  const reduce = useReducedMotion();

  function select(index: number) {
    setSelected(index);
    setZoom(true);
  }

  return <section className="section map-section" id="di-san" aria-labelledby="map-title">
    <div className="shell">
      <SectionHeading id="map-title" title="Bản đồ di sản" description="Sáu địa danh để tìm hiểu lịch sử qua những dấu tích còn lại. Chọn một điểm trên bản đồ hoặc trong danh sách." />
      <div className="map-layout">
        <figure className="map-figure">
          <div className="map-window">
            <div className="map-layer" style={{
              "--map-x": `${center.x}%`, "--map-y": `${center.y}%`, "--map-zoom": zoom ? 1.12 : 1,
            } as CSSProperties}>
              <img src="./landing/media/map.webp" alt="Bản đồ Việt Nam với hai quần đảo Hoàng Sa và Trường Sa" width="900" height="780" loading="lazy" />
              {places.map((marker, index) => {
                const point = project(marker.lon, marker.lat);
                return <button type="button" className="map-pin" data-cluster={[0,1,3].includes(index) || undefined} aria-label={marker.title} aria-pressed={index === selected} key={marker.id}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }} onClick={() => select(index)}>
                  <span className="pin-dot" />
                </button>;
              })}
            </div>
            <div className="map-north" aria-hidden="true"><Compass size={22} /><span>Bắc</span></div>
            <button type="button" className="icon-button map-zoom" aria-label={zoom ? "Thu nhỏ bản đồ" : "Phóng to bản đồ"}
              onClick={() => setZoom(!zoom)}>{zoom ? <Minus size={21} /> : <Plus size={21} />}</button>
          </div>
          <figcaption><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a><span>Vị trí từ atlas Sử Việt</span></figcaption>
        </figure>
        <div className="map-side">
          <div className="place-list" aria-label="Danh sách di tích">
            {places.map((item, index) => <button key={item.id} type="button" aria-pressed={index === selected}
              onClick={() => select(index)}><MapPin size={15} aria-hidden="true" />{item.title}</button>)}
          </div>
          <p className="sr-only" aria-live="polite">Đang xem {place.title}</p>
          <motion.article key={place.id} initial={reduce ? false : { opacity: .65 }} animate={{ opacity: 1 }}
            transition={{ duration: .28 }} className="place-detail">
            <figure>
              <img src={`./landing/media/${place.image}.webp`} alt={`Minh họa ${place.title}`} loading="lazy" width="700" height="390" />
              <figcaption>Minh họa di tích</figcaption>
            </figure>
            <div>
              <p className="era-date">{place.region}</p>
              <h3>{place.title}</h3>
              <p>{place.text}</p>
              <Source href={place.source}>Tư liệu về di tích</Source>
            </div>
          </motion.article>
        </div>
      </div>
    </div>
  </section>;
}

export function Artifacts() {
  const [index, setIndex] = useState(0);
  const item = artifacts[index];
  const reduce = useReducedMotion();

  return <section className="section paper artifact-section" id="hien-vat" aria-labelledby="artifacts-title">
    <div className="shell">
      <SectionHeading id="artifacts-title" title="Phòng trưng bày" description="Từ mặt trống đồng đến ván in, mỗi hiện vật lưu lại một phần đời sống của người xưa." />
      <div className="artifact-layout">
        <figure className="artifact-figure" key={item.image}>
          <motion.img src={`./landing/media/${item.image}.webp`} alt={item.title} loading="lazy" width="1240" height="960"
            initial={reduce ? false : { opacity: .5, clipPath: "inset(5% 0 0)" }}
            animate={{ opacity: 1, clipPath: "inset(0% 0 0)" }}
            transition={{ duration: reduce ? 0 : .4, ease: [.16, 1, .3, 1] }} />
          <figcaption>
            <a href={item.creditUrl} target="_blank" rel="noopener noreferrer">{item.credit}</a>
            {"license" in item && <> <a href={item.license} target="_blank" rel="noopener noreferrer">Giấy phép ảnh</a></>}
          </figcaption>
        </figure>
        <div className="artifact-side">
          <div className="artifact-copy" aria-live="polite">
            <p className="era-date">{item.type}</p>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
            <Source href={item.source}>Hồ sơ hiện vật</Source>
          </div>
          <div className="artifact-selector" aria-label="Chọn hiện vật">
            {artifacts.map((artifact, number) => <button key={artifact.image} className="artifact-option"
              type="button" aria-pressed={number === index} onClick={() => setIndex(number)}>
              <span>{artifact.title}</span><ArrowUpRight size={17} aria-hidden="true" />
            </button>)}
          </div>
        </div>
      </div>
    </div>
  </section>;
}

type QuizState = { phase: "start" } | { phase: "question"; index: number; answers: number[] } | { phase: "done"; answers: number[] };

export function Quiz() {
  const [state, setState] = useState<QuizState>({ phase: "start" });
  const title = useRef<HTMLHeadingElement>(null);
  const reduce = useReducedMotion();
  const step = state.phase === "question" ? state.index : state.phase;
  useEffect(() => {
    if (step !== "start") title.current?.focus({ preventScroll: true });
  }, [step]);

  function start() {
    setState({ phase: "question", index: 0, answers: [] });
  }

  return <section className="section quiz-section" id="thu-suc" aria-labelledby="quiz-title">
    <div className="shell quiz-layout">
      <div className="quiz-intro">
        <BookOpen size={29} strokeWidth={1.35} aria-hidden="true" />
        <h2 id="quiz-title">Bạn hiểu lịch sử Việt Nam đến đâu?</h2>
        <p>Bốn câu hỏi về các sự kiện bạn vừa gặp. Mỗi đáp án có giải thích và nguồn để đọc thêm.</p>
      </div>
      <motion.div className="quiz-panel" key={step} initial={reduce || step === "start" ? false : { opacity: .64, y: 6 }}
        animate={{ opacity: 1, y: 0 }} transition={{ duration: .22 }}>
        {state.phase === "start" && <>
          <p className="count">4 câu hỏi · khoảng 2 phút</p>
          <h3>Thử sức với Sử Việt</h3>
          <p>Bạn sẽ xem giải thích ngay sau mỗi lựa chọn.</p>
          <button className="button gold" type="button" onClick={start}>Bắt đầu trả lời <ArrowRight size={18} aria-hidden="true" /></button>
        </>}
        {state.phase === "question" && (() => {
          const question = questions[state.index];
          const choice = state.answers[state.index];
          const answered = choice !== undefined;
          return <>
            <div className="quiz-progress">
              <span className="count">Câu {state.index + 1} / {questions.length}</span>
              <progress aria-label="Số câu đã trả lời" max={questions.length} value={state.answers.length} />
            </div>
            <h3 ref={title} tabIndex={-1}>{question.title}</h3>
            <div className="answers">
              {question.choices.map((answer, index) => <button type="button" className="answer"
                key={answer} aria-disabled={answered} aria-pressed={choice === index}
                data-result={answered && index === question.correct ? "correct" : answered && choice === index ? "other" : undefined}
                onClick={() => { if (!answered) setState({ ...state, answers: [...state.answers, index] }); }}>
                <span>{String.fromCharCode(65 + index)}</span>{answer}{answered && index === question.correct && <Check size={19} aria-hidden="true" />}
              </button>)}
            </div>
            <div role="status">
              {answered && <div className="answer-feedback"><b>{choice === question.correct ? "Chính xác." : "Cùng xem đáp án."}</b> {question.note} <Source href={question.source} /></div>}
            </div>
            {answered && <button className="button gold" type="button" onClick={() => setState(state.index === questions.length - 1
              ? { phase: "done", answers: state.answers } : { ...state, index: state.index + 1 })}>
              {state.index === questions.length - 1 ? "Xem kết quả" : "Câu tiếp theo"} <ArrowRight size={18} aria-hidden="true" />
            </button>}
          </>;
        })()}
        {state.phase === "done" && <>
          <p className="count">Kết quả</p>
          <h3 ref={title} tabIndex={-1}>{state.answers.filter((answer, index) => answer === questions[index].correct).length} / {questions.length} câu đúng</h3>
          <p>Bạn đã hoàn thành phần thử sức. Hãy đọc lại các câu chuyện để đặt từng đáp án vào bối cảnh.</p>
          <div className="actions">
            <button className="button gold" type="button" onClick={start}><RotateCcw size={17} aria-hidden="true" /> Làm lại</button>
            <a className="button ghost" href="#cau-chuyen">Đọc các câu chuyện</a>
          </div>
        </>}
      </motion.div>
    </div>
  </section>;
}
