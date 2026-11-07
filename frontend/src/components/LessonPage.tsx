// The lesson page (#/lesson/<id>): projector-sized player, chapters with sources, and the tabs
// below. Teachers see editing and planning tools; students (and the teacher's preview) do not.
import { Link, useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import type { Section, Source, Status } from '../lib/lesson-schema';
import { getAllLessons, getLessonProgress, getStudentRun, getVisibleForStudent, saveLesson, saveLessonProgress, type AppLesson } from '../lib/storage';
import type { SilkMapScene } from '../scene/silk-map';
import { Player } from './Player';
import { Icon, Modal, StatusChip } from './ui';

export const LESSON_STAGES = [
  { title: 'Khởi động', minutes: 5 },
  { title: 'Khám phá sa bàn gốc', minutes: 10 },
  { title: 'Câu hỏi của nhân vật', minutes: 8 },
  { title: 'Thử cách khác', minutes: 7 },
  { title: 'So sánh', minutes: 8 },
  { title: 'Củng cố', minutes: 7 }
];

export const sectionProgress = (section: Section, index: number, count: number) => (section.timelineRange > 0 ? section.timelineRange : (index + 1) / count);
export function chapterAt(sections: Section[], progress: number) {
  let active = 0;
  sections.forEach((s, i) => sectionProgress(s, i, sections.length) <= progress && (active = i));
  return active;
}

/** Source dialog: book, chapter, quote, note, and the link only when it is HTTPS. */
export function SourceModal({ source, onClose }: { source: Source | null; onClose: () => void }) {
  const url = (() => {
    try {
      const parsed = new URL(source?.url ?? '');
      return parsed.protocol === 'https:' ? parsed.href : '';
    } catch {
      return '';
    }
  })();
  return (
    <Modal id="modal-source" open={Boolean(source)} title="Nguồn tư liệu" onClose={onClose}>
      {source && (
        <dl className="flex flex-col gap-3">
          <div><dt className="t-sm muted">Tài liệu</dt><dd className="font-semibold">{source.book}</dd></div>
          {source.publisher && <div><dt className="t-sm muted">Cơ quan / tác giả</dt><dd>{source.publisher}</dd></div>}
          {source.chapter && <div><dt className="t-sm muted">Thiên / Quyển / Năm</dt><dd>{source.chapter}</dd></div>}
          {source.quote && <blockquote className="rounded-lg bg-page px-4 py-3 font-serif italic">“{source.quote}”</blockquote>}
          {source.note && <p className="t-sm muted">{source.note}</p>}
          {url && <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold">Mở tài liệu nguồn <span aria-hidden>↗</span></a>}
        </dl>
      )}
    </Modal>
  );
}

type Mode = 'teacher' | 'student' | 'preview';

export function LessonPage({ initial, mode }: { initial: AppLesson; mode: Mode }) {
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(initial);
  const saved = useRef(getLessonProgress(lesson.id)).current;
  const sections = lesson.sections;
  const [chapter, setChapter] = useState(Math.min(saved.chapter, Math.max(0, sections.length - 1)));
  const [source, setSource] = useState<Source | null>(null);
  const scene = useRef<SilkMapScene | null>(null);
  const teacher = mode === 'teacher';
  const studentView = mode !== 'teacher';
  const [tab, setTab] = useState(teacher ? 'content' : 'keynotes');

  const list = mode === 'student' ? getVisibleForStudent() : getAllLessons();
  const index = list.findIndex((l) => l.id === lesson.id);
  const neighbors = [list[index - 1], list[index + 1]];
  const hub = mode === 'student' ? '/student' : '/teacher';
  const current = sections[chapter];
  const hasVariables = Boolean(lesson.question?.variables.length);

  const onProgress = (progress: number) => {
    const next = chapterAt(sections, progress);
    if (next !== chapter) setChapter(next);
    saveLessonProgress(lesson.id, { progress, chapter: next });
  };

  const save = (status: Status) => {
    if (status === 'Đã dạy' && lesson.sourceReview?.claimStatus === 'pending') {
      window.alert('Bài nháp đang có thông tin chờ đối chiếu. Hãy mở nguồn tham khảo và xác nhận đã kiểm tra trước khi phát hành.');
      return;
    }
    setLesson(saveLesson({ ...lesson, status }));
  };

  const tabs: [string, string][] = teacher
    ? [['content', 'Nội dung'], ['questions', 'Câu hỏi'], ['simulation', 'Mô phỏng 3D'], ['notes', 'Ghi chú giảng dạy']]
    : [['keynotes', 'Ghi chú chính'], ['questions', 'Câu hỏi của thầy cô'], ['simulation', 'Mô phỏng của em']];

  return (
    <main id="view-lesson-workspace" className="app-view active mx-auto max-w-[90rem] px-4 pb-12 pt-5">
      {mode === 'preview' && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-lacquer px-4 py-3 text-page">
          <p className="font-semibold">Đang xem như học sinh. Ghi chú giảng dạy và công cụ soạn thảo được ẩn.</p>
          <Link to="/lesson/$id" params={{ id: lesson.id }} className="btn btn-sm border-page/40 bg-transparent text-page" data-toggle-student-preview>
            <Icon name="close" /> Thoát xem trước
          </Link>
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link to={hub} className="btn btn-quiet btn-sm -ml-2 btn-back-dash"><Icon name="back" /> {mode === 'student' ? 'Bài đã học' : 'Quản lý bài giảng'}</Link>
          <h1 className="mt-1 t-3xl font-bold">{lesson.title}</h1>
          {lesson.subtitle && <p className="mt-1 t-lg muted">{lesson.subtitle}</p>}
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 t-sm muted">
            <span>{lesson.date}</span><span>{lesson.class}</span><span>{lesson.teacher}</span>
            {teacher && <StatusChip status={lesson.status} />}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {teacher && (
            <>
              <Link to="/lesson/$id/edit" params={{ id: lesson.id }} className="btn btn-secondary"><Icon name="edit" /> Soạn thảo</Link>
              <Link to="/lesson/$id/preview" params={{ id: lesson.id }} className="btn btn-secondary"><Icon name="eye" /> Xem như học sinh</Link>
            </>
          )}
          <Link to="/lesson/$id/interactive" params={{ id: lesson.id }} search={{}} className="btn btn-primary" data-start-interactive>
            <Icon name="play" /> {teacher ? 'Bắt đầu tiến trình 6 bước' : 'Học theo 6 bước'}
          </Link>
        </div>
      </div>

      <nav className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Kế hoạch tiết học 6 bước">
        {LESSON_STAGES.map((stage, i) => {
          const locked = i >= 3 && !hasVariables;
          return (
            <Link
              key={stage.title}
              to="/lesson/$id/interactive"
              params={{ id: lesson.id }}
              search={{ step: i + 1 }}
              disabled={locked}
              className={`lesson-stage rounded-lg border border-rule bg-card px-3 py-2 no-underline text-ink ${locked ? 'opacity-45' : 'hover:border-[var(--sepia)]'}`}
              data-stage-index={i}
            >
              <span className="block t-xs muted">Bước {i + 1} · {stage.minutes} phút</span>
              <span className="block t-sm font-semibold leading-snug">{stage.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-label="Sa bàn">
          <Player
            lesson={lesson}
            prefix="lesson"
            speed
            initialProgress={saved.progress}
            onProgress={onProgress}
            onScene={(s) => (scene.current = s)}
            badge={lesson.era ? `Sa bàn · ${lesson.era}` : 'Sa bàn'}
          />
          <p className="lesson-disclaimer mt-2 t-xs muted">{lesson.simulationDisclaimer || 'Sa bàn là hình minh họa; vị trí, quân số và trang phục chưa được chuyên gia thẩm định.'}</p>
          <div className="mt-3 flex items-center justify-between gap-2 t-sm">
            {neighbors.map((n, i) =>
              n ? (
                <Link key={n.id} to="/lesson/$id" params={{ id: n.id }} className="btn btn-quiet btn-sm">
                  {i === 0 && <Icon name="back" />} {i === 0 ? 'Bài trước' : 'Bài tiếp theo'} {i === 1 && <Icon name="next" />}
                </Link>
              ) : (
                <span key={i} />
              )
            )}
          </div>
        </section>

        <aside className="lesson-chapters-panel flex min-w-0 flex-col gap-3" aria-label="Các giai đoạn">
          <h2 className="t-lg font-semibold">Diễn biến · {sections.length} giai đoạn</h2>
          <div className="lesson-chapter-list flex flex-col gap-1" id="lesson-chapter-list">
            {sections.map((section, i) => (
              <button
                key={section.id}
                type="button"
                className={`lesson-chapter-item${i === chapter ? ' active' : ''}`}
                aria-current={i === chapter ? 'step' : undefined}
                data-chapter-index={i}
                onClick={() => {
                  setChapter(i);
                  scene.current?.seek(sectionProgress(section, i, sections.length));
                }}
              >
                <span className="chapter-time-tag">{String(i + 1).padStart(2, '0')} · {section.timeLabel}</span>
                <strong className="block leading-snug">{section.title}</strong>
              </button>
            ))}
            {!sections.length && <p className="t-sm muted">Bài học chưa có giai đoạn nội dung.</p>}
          </div>
          <article id="chapter-current" className="chapter-current card p-4" aria-live="polite">
            {current ? (
              <>
                <h3 className="t-sm font-semibold muted">Giai đoạn {chapter + 1} · Lời dẫn</h3>
                <p className="mt-1">{current.narration || 'Chưa có lời dẫn cho giai đoạn này.'}</p>
                {current.caption && <p className="mt-2 border-t border-rule pt-2 t-sm italic muted">{current.caption}</p>}
                {current.source && (
                  <button type="button" className="btn btn-secondary btn-sm chapter-source-button mt-3" onClick={() => setSource(current.source!)}>
                    <Icon name="book" /> Xem nguồn
                  </button>
                )}
              </>
            ) : (
              <p className="t-sm muted">Chưa có lời dẫn hoặc chú thích cho bài học này.</p>
            )}
          </article>
        </aside>
      </div>

      <section className="mt-8">
        <div className="tabs" role="tablist" id="lesson-tabs">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" role="tab" className="tab lesson-tab" aria-selected={tab === id} data-workspace-tab={id} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="pt-5" role="tabpanel" id="lesson-tab-content">
          {tab === 'content' && teacher && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
              <div className="flex flex-col gap-3">
                <label className="block"><span className="label">Đề bài</span><input className="field workspace-title-input" value={lesson.title} onChange={(e) => setLesson({ ...lesson, title: e.target.value })} /></label>
                <label className="block"><span className="label">Mục tiêu bài học</span><textarea className="field" rows={4} value={lesson.objectives} onChange={(e) => setLesson({ ...lesson, objectives: e.target.value })} /></label>
                <p className="t-sm muted">Sửa giai đoạn, câu hỏi và biến số trong trang Soạn thảo.</p>
              </div>
              <SectionCards sections={sections} />
            </div>
          )}
          {tab === 'keynotes' && <KeyNotes notes={lesson.keyNotes} />}
          {tab === 'questions' && <Questions lesson={lesson} interactive={studentView} />}
          {tab === 'simulation' && (
            <div className="card max-w-3xl p-5">
              {studentView && <PreviousRun lessonId={lesson.id} />}
              <p className={studentView ? 'mt-3' : ''}>{hasVariables ? 'Ở bước 3, nhân vật lịch sử đặt câu hỏi. Em đổi phương án, chạy mô phỏng và so sánh với cách gốc.' : 'Bài học này chưa có phần thử cách khác. Các biến số đang được biên soạn.'}</p>
              <button type="button" className="btn btn-primary mt-4" disabled={!hasVariables} onClick={() => navigate({ to: '/lesson/$id/interactive', params: { id: lesson.id }, search: { step: 3 } })}>
                Đến bước câu hỏi <Icon name="next" />
              </button>
            </div>
          )}
          {tab === 'notes' && teacher && (
            <label className="block max-w-3xl">
              <span className="label">Ghi chú giảng dạy (chỉ giáo viên thấy)</span>
              <textarea className="field workspace-notes-input" rows={8} value={lesson.privateNotes} onChange={(e) => setLesson({ ...lesson, privateNotes: e.target.value })} />
            </label>
          )}
        </div>
        {teacher && (
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-rule pt-4">
            <span className="mr-auto t-sm muted">Lưu thay đổi ở trang này và đặt trạng thái:</span>
            <button type="button" className="btn btn-secondary" data-save-status="Nháp" onClick={() => save('Nháp')}>Lưu nháp</button>
            <button type="button" className="btn btn-secondary" data-save-status="Đã lên lịch" onClick={() => save('Đã lên lịch')}>Lên lịch</button>
            <button type="button" className="btn btn-primary" data-save-status="Đã dạy" onClick={() => save('Đã dạy')}>Phát hành cho học sinh</button>
          </div>
        )}
      </section>
      <SourceModal source={source} onClose={() => setSource(null)} />
    </main>
  );
}

function SectionCards({ sections }: { sections: Section[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {sections.map((s, i) => (
        <li key={s.id} className="card p-4">
          <p className="chapter-time-tag">Giai đoạn {i + 1} · {s.timeLabel}</p>
          <h3 className="t-lg font-semibold">{s.title}</h3>
          <p className="mt-1 t-sm">{s.narration}</p>
        </li>
      ))}
    </ol>
  );
}

function KeyNotes({ notes }: { notes: string[] }) {
  if (!notes.length) return <p className="muted">Chưa có ghi chú chính cho bài học này.</p>;
  return (
    <ul className="card flex max-w-3xl flex-col gap-3 p-5">
      {notes.map((n, i) => (
        <li key={i} className="flex gap-3"><Icon name="check" className="icon mt-1 text-ok" /> <span>{n}</span></li>
      ))}
    </ul>
  );
}

function Questions({ lesson, interactive }: { lesson: AppLesson; interactive: boolean }) {
  const [picked, setPicked] = useState<Record<string, string>>({});
  if (!lesson.questions.length) return <p className="muted">Thầy cô chưa thêm câu hỏi luyện tập cho bài học này.</p>;
  return (
    <ol className="flex max-w-3xl flex-col gap-4">
      {lesson.questions.map((q, i) => {
        const chosen = q.options?.find((o) => o.id === picked[q.id]);
        return (
          <li key={q.id} className="card p-5">
            <p className="font-semibold">Câu {i + 1}. {q.text}</p>
            {q.type === 'multiple_choice' && q.options ? (
              <fieldset className="mt-3 flex flex-col gap-2" disabled={!interactive}>
                <legend className="sr-only">Chọn một đáp án</legend>
                {q.options.map((o) => (
                  <label key={o.id} className="variable-option">
                    <input type="radio" name={`q-${q.id}`} value={o.id} checked={picked[q.id] === o.id} onChange={() => setPicked({ ...picked, [q.id]: o.id })} />
                    <span>{o.text}{!interactive && o.isCorrect && <span className="original-badge">Đáp án</span>}</span>
                  </label>
                ))}
              </fieldset>
            ) : (
              interactive ? <textarea className="field mt-3" placeholder="Em ghi suy nghĩ của mình (chỉ lưu trên màn hình này)…" aria-label={`Trả lời câu ${i + 1}`} /> : q.guide && <p className="mt-2 t-sm muted">Gợi ý: {q.guide}</p>
            )}
            {chosen && (
              <p className={`mt-3 rounded-lg px-3 py-2 t-sm ${chosen.isCorrect ? 'bg-[#dde9d8] text-ok' : 'bg-[#f3e1c9] text-warn'}`} role="status">
                <strong>{chosen.isCorrect ? 'Chính xác. ' : 'Chưa đúng, em thử nghĩ thêm nhé. '}</strong>
                {q.isExplanationReleased ? chosen.explanation : chosen.isCorrect ? 'Thầy cô sẽ giải thích chi tiết trên lớp.' : 'Hãy xem lại sa bàn và lời dẫn từng giai đoạn.'}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function PreviousRun({ lessonId }: { lessonId: string }) {
  const run = getStudentRun(lessonId);
  if (!run) return <p className="t-sm muted">Em chưa thử phương án riêng nào cho bài học này.</p>;
  return (
    <div className="rounded-lg bg-page p-4">
      <p className="font-semibold">Lần thử trước của em ({new Date(run.timestamp).toLocaleString('vi-VN')})</p>
      <p className="mt-1 t-sm">Thời gian {run.student.durationHours} giờ · Tổn thất {run.student.casualties.toLocaleString('vi-VN')} · Điểm thế trận {run.student.positionScore}/100</p>
      <p className="mt-1 t-sm muted">{run.student.outcomeSummary}</p>
    </div>
  );
}

export function LessonHidden() {
  return (
    <main id="view-lesson-hidden" className="app-view active mx-auto max-w-xl px-4 py-16 text-center">
      <Icon name="lock" className="mx-auto h-12 w-12 text-muted" />
      <h1 className="mt-4 t-2xl font-bold">Bài học chưa mở</h1>
      <p className="mt-2 muted">Bài này đang là bản nháp hoặc đã lên lịch cho ngày sắp tới. Em sẽ xem được khi thầy cô phát hành.</p>
      <Link to="/student" className="btn btn-primary mt-6"><Icon name="back" /> Về danh sách bài đã học</Link>
    </main>
  );
}
