// The 6-stage classroom loop (#/lesson/<id>/interactive): intro, original battle, the character's
// question with the class panel, the student's version, the comparison, and the wrap-up.
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Role } from '../lib/auth';
import { calculate, generateExplanation, originalChoices, type Choices } from '../lib/engine';
import { isConfigured } from '../lib/class-session';
import { saveStudentRun, type AppLesson } from '../lib/storage';
import { ClassPanel, Survey, submitChoices, surveyVisible } from './ClassPanel';
import { sectionProgress } from './LessonPage';
import { Player } from './Player';
import type { SilkMapScene } from '../scene/silk-map';
import { Icon, Modal, SIMULATION_NOTICE } from './ui';

const STEPS = ['Khởi động', 'Khám phá sa bàn gốc', 'Câu hỏi của nhân vật', 'Thử cách khác', 'So sánh', 'Củng cố & Tổng kết'];
const SCREENS = ['screen-intro', 'screen-sim-original', 'screen-question', 'screen-sim-custom', 'screen-comparison', 'screen-explanation'];

const days = (hours: number) => (hours / 24).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
const signed = (n: number, unit = '') => (n === 0 ? 'như cách gốc' : `${n > 0 ? '+' : '−'}${Math.abs(n).toLocaleString('vi-VN')}${unit} so với cách gốc`);

export function StageLoop({ lesson, role, initialStep }: { lesson: AppLesson; role: Role; initialStep?: number }) {
  const navigate = useNavigate();
  const variables = lesson.question?.variables ?? [];
  const hasVariables = variables.length > 0;
  const clampStep = (n: number) => Math.min(hasVariables ? 6 : 3, Math.max(1, Math.round(n) || 1));
  const [step, setStep] = useState(() => clampStep(initialStep ?? 1));
  const [choices, setChoices] = useState<Choices>(() => originalChoices(lesson));
  const [toast, setToast] = useState<{ text: string; tone: string } | null>(null);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const startedAt = useRef(Date.now()).current;
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const result = useMemo(() => (step >= 5 && hasVariables ? calculate(lesson, choices) : null), [step, lesson, choices, hasVariables]);
  useEffect(() => {
    if (result && step === 5) saveStudentRun(lesson.id, result);
  }, [result, step, lesson.id]);

  // Bring each stage into view; on the comparison the simulation notice comes first (FR-007).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus({ preventScroll: true });
    const anchor = step === 5 ? document.querySelector('#screen-comparison .prominent-simulation-banner') : document.querySelector('.lesson-stepper');
    anchor?.scrollIntoView({ block: 'start' });
    document.querySelector(`.step-node[data-step="${step}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [step]);

  useEffect(() => {
    if (!toast?.text) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const goTo = (n: number) => setStep(clampStep(n));
  const run = async () => {
    if (!hasVariables) return;
    const sent = { ...choices };
    goTo(4);
    const line = await submitChoices(lesson.id, sent, startedAt);
    if (line.text) setToast(line);
  };

  const character = lesson.question?.character;
  const originalLabel = lesson.question?.originalLabel ?? 'Cách gốc trong lịch sử';
  const title = STEPS[step - 1];

  return (
    <main id="view-lesson-detail" className="app-view active mx-auto max-w-[90rem] px-4 pb-12 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/lesson/$id" params={{ id: lesson.id }} id="btn-back-from-6stages" className="btn btn-quiet btn-sm -ml-2"><Icon name="back" /> Về trang bài học</Link>
        <p className="t-sm muted">{lesson.era}</p>
      </div>
      <h1 className="t-2xl font-bold">{lesson.title}</h1>

      <nav className="lesson-stepper mt-3 card" aria-label="Tiến trình 6 bước của bài học">
        {STEPS.map((name, i) => {
          const n = i + 1;
          return (
            <button
              key={name}
              type="button"
              className={`step-node${n === step ? ' active' : ''}${n < step ? ' complete' : ''}`}
              data-step={n}
              data-screen={SCREENS[i]}
              aria-current={n === step ? 'step' : undefined}
              disabled={n > 3 && !hasVariables}
              onClick={() => goTo(n)}
            >
              <span className="step-num">{n < step ? <Icon name="check" className="h-3.5 w-3.5" /> : n}</span>
              <span className="step-name">{name}</span>
            </button>
          );
        })}
      </nav>
      <h2 ref={heading} tabIndex={-1} className="sr-only">Bước {step}: {title}</h2>

      <div className="mt-5">
        {step === 1 && (
          <section id="screen-intro" className="screen-view active mx-auto max-w-3xl card p-6 text-center sm:p-10">
            <h2 className="t-3xl font-bold">{lesson.subtitle || lesson.title}</h2>
            <p className="mt-4 text-left t-lg leading-relaxed">{lesson.introSummary || lesson.objectives}</p>
            {lesson.focusQuestion && (
              <p className="mt-5 rounded-xl bg-page px-5 py-4 text-left">
                <span className="block t-sm font-semibold muted">Câu hỏi trọng tâm</span>
                <span className="font-serif t-lg">{lesson.focusQuestion}</span>
              </p>
            )}
            <button id="btn-start-6stages" type="button" className="btn btn-primary mt-6" onClick={() => goTo(2)}>
              Bắt đầu: xem sa bàn diễn biến gốc <Icon name="next" />
            </button>
          </section>
        )}

        {step === 2 && (
          <section id="screen-sim-original" className="screen-view active grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <OriginalStage lesson={lesson} onNext={() => goTo(3)} />
          </section>
        )}

        {step === 3 && (
          <section id="screen-question" className="screen-view active grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <aside id="class-panel" className="class-panel lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1" aria-label="Phiên lớp" aria-live="polite" hidden={role === 'student' && !isConfigured()}>
              <ClassPanel lesson={lesson} role={role} />
            </aside>
            <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1">
              {character && (
                <figure className="card flex gap-4 p-5">
                  <span className="grid h-14 w-14 flex-none place-items-center rounded-full bg-lacquer font-serif t-xl font-bold text-page" aria-hidden>{character.name.split(' ').pop()?.[0]}</span>
                  <div>
                    <figcaption className="font-serif t-lg font-semibold">{character.name}</figcaption>
                    <blockquote id="emperor-speech" className="mt-1 font-serif italic leading-relaxed">“{character.speech || character.greeting || 'Nếu là các em đứng trước tình thế năm ấy, các em sẽ làm khác ở điểm nào?'}”</blockquote>
                  </div>
                </figure>
              )}
              <div id="variables-container" className="flex flex-col gap-4">
                {variables.map((variable, vi) => (
                  <fieldset key={variable.id} className="variable-card">
                    <legend className="mb-1 font-semibold t-lg">
                      <span className="mr-1 t-sm muted tabular-nums">{vi + 1}.</span>{variable.title.replace(/^\d+\.\s*/, '')}
                    </legend>
                    {variable.description && <p className="t-sm muted">{variable.description}</p>}
                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      {variable.options.map((option) => (
                        <label key={option.id} className={`variable-option${option.isOriginal ? ' is-original' : ''}`}>
                          <input type="radio" name={`var-${variable.id}`} value={option.id} checked={choices[variable.id] === option.id} onChange={() => setChoices({ ...choices, [variable.id]: option.id })} />
                          <span className="min-w-0">
                            <strong className="block leading-snug">
                              {option.name}
                              {option.isOriginal && <span className="original-badge">{originalLabel}</span>}
                            </strong>
                            {option.desc && <span className="mt-1 block t-sm muted">{option.desc}</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
              <div id="question-empty-notice" className="card p-5" hidden={hasVariables}>
                <strong>Bài học này chưa có phần thử cách khác.</strong>
                <p className="mt-1 muted">Các biến số để học sinh đổi phương án đang được biên soạn. Em có thể quay lại xem diễn biến và nguồn tư liệu.</p>
              </div>
              <div className="flex justify-end">
                <button id="btn-run-simulation" type="button" className="btn btn-primary" hidden={!hasVariables} onClick={run}>
                  Chạy mô phỏng phương án của em <Icon name="next" />
                </button>
              </div>
            </div>
          </section>
        )}

        {step === 4 && (
          <section id="screen-sim-custom" className="screen-view active grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <Player lesson={lesson} prefix="custom" badge="Sa bàn theo lựa chọn của em" />
            </div>
            <aside className="flex flex-col gap-3">
              <h3 className="t-lg font-semibold">Phương án của em</h3>
              <ol id="narration-custom-list" className="flex flex-col gap-2">
                {variables.map((v) => {
                  const option = v.options.find((o) => o.id === choices[v.id]);
                  return (
                    <li key={v.id} className="card p-3">
                      <span className="block t-xs muted">{v.title.replace(/^\d+\.\s*/, '')}</span>
                      <span className="font-semibold">{option?.name}</span>
                      {option?.isOriginal && <span className="original-badge">{originalLabel}</span>}
                    </li>
                  );
                })}
              </ol>
              <button id="btn-goto-comparison" type="button" className="btn btn-primary" onClick={() => goTo(5)}>
                Xem bảng so sánh kết quả <Icon name="next" />
              </button>
            </aside>
          </section>
        )}

        {step === 5 && result && (
          <section id="screen-comparison" className="screen-view active mx-auto flex max-w-5xl flex-col gap-5">
            <div className="prominent-simulation-banner" role="note">
              <Icon name="warning" className="mt-0.5 h-6 w-6 flex-none" />
              <div>
                <p className="banner-warning-text">{SIMULATION_NOTICE}</p>
                <p className="mt-1 t-sm">{stripNotice(lesson.simulationDisclaimer) || 'Mọi số liệu (thời gian, tổn thất, điểm thế trận) là giá trị minh họa từ các giả định của bài học nhằm khơi gợi tư duy phản biện, không thay thế cho các nghiên cứu lịch sử chính thức.'}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Outcome
                prefix="orig"
                title={originalLabel}
                duration={`${result.original.durationHours} giờ (~${days(result.original.durationHours)} ngày)`}
                casualties={`${result.original.casualties.toLocaleString('vi-VN')} binh sĩ`}
                score={`${result.original.positionScore} / 100`}
                note={lesson.baseline?.ratingText}
              />
              <Outcome
                prefix="cust"
                title="Phương án của em"
                duration={`${result.student.durationHours} giờ (~${days(result.student.durationHours)} ngày)`}
                casualties={`${result.student.casualties.toLocaleString('vi-VN')} binh sĩ`}
                score={`${result.student.positionScore} / 100`}
                deltas={[signed(result.student.durationHours - result.original.durationHours, ' giờ'), signed(result.student.casualties - result.original.casualties), signed(result.student.positionScore - result.original.positionScore, ' điểm')]}
                note={result.student.outcomeSummary}
                highlight
              />
            </div>
            <div className="flex flex-wrap justify-between gap-3">
              <button id="btn-view-assumptions" type="button" className="btn btn-secondary" onClick={() => setAssumptionsOpen(true)}>
                <Icon name="sliders" /> Xem giả định và cách tính
              </button>
              <button id="btn-goto-explanation" type="button" className="btn btn-primary" onClick={() => goTo(6)}>
                Nghe nhận xét và củng cố <Icon name="next" />
              </button>
            </div>
            <Modal id="modal-assumptions" open={assumptionsOpen} title="Giả định và cách tính" onClose={() => setAssumptionsOpen(false)}>
              <p className="t-sm">Kết quả = số liệu gốc ({lesson.baseline?.durationHours ?? 36} giờ, {(lesson.baseline?.casualties ?? 1800).toLocaleString('vi-VN')} binh sĩ, {lesson.baseline?.positionScore ?? 95} điểm) cộng các hệ số của từng lựa chọn. Cùng lựa chọn luôn cho cùng kết quả.</p>
              <ul className="mt-3 flex flex-col gap-2">
                {result.appliedAssumptions.map((a) => (
                  <li key={a.variableId} className="rounded-lg bg-page p-3">
                    <p><strong>{a.variable.replace(/^\d+\.\s*/, '')}:</strong> {a.choice}</p>
                    <p className="mt-0.5 t-sm tabular-nums muted">
                      {a.isOriginal ? 'Cách gốc: không thay đổi.' : `Thời gian ${a.timeDelta >= 0 ? '+' : ''}${a.timeDelta} giờ · Tổn thất ${a.casualtyDelta >= 0 ? '+' : ''}${a.casualtyDelta.toLocaleString('vi-VN')} · Điểm ${a.scoreDelta >= 0 ? '+' : ''}${a.scoreDelta}`}
                    </p>
                    {a.explanation && <p className="mt-1 t-sm">{a.explanation}</p>}
                  </li>
                ))}
              </ul>
            </Modal>
          </section>
        )}

        {step === 6 && <Explanation lesson={lesson} choices={choices} role={role} startedAt={startedAt} onRetry={() => goTo(3)} onFinish={() => navigate({ to: '/lesson/$id', params: { id: lesson.id } })} />}
      </div>

      <div id="class-submit-toast" className="class-toast" role="status" data-tone={toast?.tone} hidden={!toast?.text}>{toast?.text}</div>
    </main>
  );
}

function OriginalStage({ lesson, onNext }: { lesson: AppLesson; onNext: () => void }) {
  const scene = useRef<SilkMapScene | null>(null);
  const [active, setActive] = useState(-1);
  const sections = lesson.sections;
  return (
    <>
      <div>
        <Player lesson={lesson} prefix="original" badge={`Sa bàn diễn biến gốc${lesson.era ? ` · ${lesson.era}` : ''}`} onScene={(s) => (scene.current = s)} speed />
        <div className="mt-3 flex justify-end">
          <button id="btn-goto-question" type="button" className="btn btn-primary" onClick={onNext}>
            Tiếp tục: câu hỏi của nhân vật <Icon name="next" />
          </button>
        </div>
      </div>
      <aside>
        <h3 className="t-lg font-semibold">Các giai đoạn</h3>
        <div id="narration-original-list" className="mt-2 flex flex-col gap-1">
          {sections.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`chapter-item-card${i === active ? ' active' : ''}`}
              onClick={() => {
                setActive(i);
                scene.current?.seek(sectionProgress(s, i, sections.length));
              }}
            >
              <span className="chapter-time-tag">{s.timeLabel}</span>
              <strong className="block leading-snug">{s.title}</strong>
              <span className="mt-1 line-clamp-3 block t-sm muted">{s.narration}</span>
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}

function Outcome({ prefix, title, duration, casualties, score, deltas, note, highlight }: { prefix: string; title: string; duration: string; casualties: string; score: string; deltas?: string[]; note?: string; highlight?: boolean }) {
  const rows: [string, string, string][] = [['duration', 'Thời gian chiến dịch', duration], ['casualties', 'Tổn thất ước tính', casualties], ['score', 'Điểm thế trận', score]];
  return (
    <article className={`card p-5 ${highlight ? 'border-faction-b' : ''}`}>
      <h3 className="t-xl font-semibold">{title}</h3>
      <dl className="mt-3 flex flex-col gap-3">
        {rows.map(([key, label, value], i) => (
          <div key={key}>
            <dt className="t-sm muted">{label}</dt>
            <dd id={`comp-${prefix}-${key}`} className="metric">{value}</dd>
            {deltas && <dd className="t-xs muted">{deltas[i]}</dd>}
          </div>
        ))}
      </dl>
      {note && <p id={highlight ? 'comp-cust-outcome-summary' : undefined} className="mt-4 border-t border-rule pt-3 t-sm">{note}</p>}
    </article>
  );
}

function Explanation({ lesson, choices, role, startedAt, onRetry, onFinish }: { lesson: AppLesson; choices: Choices; role: Role; startedAt: number; onRetry: () => void; onFinish: () => void }) {
  const explanation = generateExplanation(lesson, choices);
  // Lessons without written feedback still get one point per choice, from its stated assumption.
  const points = explanation.variablePoints.length
    ? explanation.variablePoints.map((p) => ({ key: p.variableId, text: p.text }))
    : (lesson.question?.variables ?? []).map((v) => {
        const option = v.options.find((o) => o.id === choices[v.id]);
        return { key: v.id, text: `${v.title.replace(/^\d+\.\s*/, '')}: ${option?.name}. ${option?.assumptions ?? ''}`.trim() };
      });
  const name = lesson.question?.character?.name;
  return (
    <section id="screen-explanation" className="screen-view active mx-auto max-w-3xl card p-6 sm:p-8">
      <h2 className="t-2xl font-bold">{name ? `Lời nhận xét của ${name}` : 'Nhận xét và củng cố'}</h2>
      <p id="explanation-intro-quote" className="mt-3 font-serif t-lg italic leading-relaxed">“{explanation.intro}”</p>
      <ul id="explanation-points-list" className="mt-5 flex flex-col gap-3">
        {points.map((p) => (
          <li key={p.key} className="rounded-lg bg-page px-4 py-3 leading-relaxed">{p.text}</li>
        ))}
      </ul>
      <p id="explanation-closing-text" className="mt-5 rounded-lg bg-[#dde9d8] px-4 py-3 font-semibold text-ok">{explanation.encouragement}</p>
      {surveyVisible(lesson.id, role) && <Survey lessonId={lesson.id} startedAt={startedAt} />}
      <div className="mt-6 flex flex-wrap justify-between gap-3">
        <button id="btn-try-another-tactics" type="button" className="btn btn-secondary" onClick={onRetry}>
          <Icon name="undo" /> Thử phương án khác
        </button>
        <button id="btn-finish-6stages" type="button" className="btn btn-primary" onClick={onFinish}>
          <Icon name="check" /> Hoàn thành, về trang bài học
        </button>
      </div>
    </section>
  );
}

// The lesson's disclaimer often repeats the mandatory notice; show the notice once.
function stripNotice(text?: string) {
  const t = (text ?? '').trim();
  return t.toUpperCase().startsWith(SIMULATION_NOTICE) ? t.slice(SIMULATION_NOTICE.length).trim() : t;
}
