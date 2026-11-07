// Teacher lesson editor (#/lesson/<id>/edit): content, questions, the variables & coefficients
// form, the 3D scene and private notes, with undo/redo and zod validation before every save.
import { Link, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CAMERA_PRESETS, TERRAINS, playabilityIssues, validateLesson, type Section, type Status } from '../lib/lesson-schema';
import { saveLesson, type AppLesson } from '../lib/storage';
import type { SilkMapScene } from '../scene/silk-map';
import { normalizeCounts } from '../scene/counts';
import { CAMERA_LABELS, Player } from './Player';
import { Field, Icon, Modal, StatusChip } from './ui';
import { VariablesEditor, type Edit } from './VariablesEditor';

const HISTORY_LIMIT = 25;
const COALESCE_MS = 900;

/** Undo/redo over whole-lesson snapshots. Typing in one field within ~1 s is one step. */
function useHistory(initial: AppLesson) {
  const [state, setState] = useState({ past: [] as AppLesson[], present: initial, future: [] as AppLesson[] });
  const last = useRef({ key: '', at: 0 });
  const edit: Edit = useCallback((key, mutate) => {
    setState((s) => {
      const next = structuredClone(s.present);
      mutate(next);
      const now = Date.now();
      const coalesce = key === last.current.key && now - last.current.at < COALESCE_MS && s.past.length > 0;
      last.current = { key, at: now };
      return { past: coalesce ? s.past : [...s.past, s.present].slice(-HISTORY_LIMIT), present: next, future: [] };
    });
  }, []);
  const undo = () => setState((s) => (s.past.length ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] } : s));
  const redo = () => setState((s) => (s.future.length ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) } : s));
  const reset = (lesson: AppLesson) => setState((s) => ({ ...s, present: lesson }));
  return { lesson: state.present, edit, undo, redo, reset, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
}

const TABS = [['content', 'Nội dung'], ['questions', 'Câu hỏi'], ['variables', 'Biến số & hệ số'], ['scene', 'Sa bàn 3D'], ['notes', 'Ghi chú']] as const;
type Tab = (typeof TABS)[number][0];

export function Editor({ initial, teacher }: { initial: AppLesson; teacher: string }) {
  const navigate = useNavigate();
  const { lesson, edit, undo, redo, reset, canUndo, canRedo } = useHistory(initial);
  const [tab, setTab] = useState<Tab>('content');
  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'warn' } | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(initial));
  const issues = useMemo(() => validateLesson(lesson), [lesson]);
  const hints = useMemo(() => playabilityIssues(lesson), [lesson]);
  const dirty = JSON.stringify(lesson) !== savedJson;

  // Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z outside text fields (fields keep their own undo).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest('input, textarea, select');
      if (typing || !(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const save = (status: Status = lesson.status) => {
    if (issues.length) {
      setMessage({ text: `Chưa lưu được: ${issues.length} mục cần sửa (xem danh sách bên dưới).`, tone: 'warn' });
      return false;
    }
    const stored = saveLesson({ ...lesson, status });
    reset(stored);
    setSavedJson(JSON.stringify(stored));
    setMessage({ text: `Đã lưu · ${status === 'Đã dạy' ? 'đã phát hành cho học sinh' : status.toLowerCase()}.`, tone: 'ok' });
    return true;
  };
  const requestPublish = () => {
    if (lesson.sourceReview?.claimStatus === 'pending') {
      window.alert('Bài nháp đang có thông tin chờ đối chiếu. Hãy mở nguồn tham khảo và xác nhận đã kiểm tra trước khi phát hành.');
      return;
    }
    setConfirmPublish(true);
  };
  const markReviewed = () =>
    edit('review', (d) => {
      const at = new Date().toISOString();
      d.sourceReview = { ...d.sourceReview!, claimStatus: 'teacher-reviewed', reviewedAt: at, reviewedBy: teacher };
      const cited = d.sections.find((s) => s.source);
      if (cited?.source) cited.source.note = 'Giáo viên đã xác nhận đối chiếu trực tiếp với nguồn này. Hệ thống chỉ nhận diện liên kết, không tự xác thực sự kiện.';
    });

  return (
    <main id="view-teacher-editor" className="app-view active mx-auto max-w-[90rem] px-4 pb-16 pt-4">
      <div className="sticky top-16 z-20 -mx-4 border-b border-rule bg-page/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/teacher" id="btn-editor-back" className="btn btn-quiet btn-sm -ml-2"><Icon name="back" /> Quản lý</Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif t-lg font-semibold">{lesson.title || 'Bài chưa đặt tên'}</p>
            <p className="flex items-center gap-2 t-xs muted"><StatusChip status={lesson.status} /> {dirty ? 'Có thay đổi chưa lưu' : 'Đã lưu'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <button type="button" id="btn-editor-undo" className="btn btn-quiet btn-sm" disabled={!canUndo} onClick={undo} title="Hoàn tác (Ctrl+Z)"><Icon name="undo" /> <span className="hidden sm:inline">Hoàn tác</span></button>
            <button type="button" id="btn-editor-redo" className="btn btn-quiet btn-sm" disabled={!canRedo} onClick={redo} title="Làm lại (Ctrl+Shift+Z)"><Icon name="redo" /> <span className="hidden sm:inline">Làm lại</span></button>
            <button type="button" id="btn-editor-preview-student" className="btn btn-secondary btn-sm" onClick={() => save() && navigate({ to: '/lesson/$id/preview', params: { id: lesson.id } })}><Icon name="eye" /> <span className="hidden md:inline">Xem như học sinh</span></button>
            <button type="button" id="btn-editor-save-draft" className="btn btn-secondary btn-sm" onClick={() => save('Nháp')}>Lưu nháp</button>
            <button type="button" id="btn-editor-schedule" className="btn btn-secondary btn-sm" onClick={() => save('Đã lên lịch')}>Lên lịch</button>
            <button type="button" id="btn-editor-publish" className="btn btn-primary btn-sm" onClick={requestPublish}>Phát hành</button>
          </div>
        </div>
        {message && <p className={`mt-2 t-sm ${message.tone === 'ok' ? 'text-ok' : 'text-warn'}`} role="status">{message.text}</p>}
      </div>

      {lesson.sourceReview && (
        <section id="source-review-notice" className={`card mt-4 flex flex-wrap items-center gap-4 p-4 ${lesson.sourceReview.claimStatus === 'pending' ? 'bg-[#f3e1c9]' : 'bg-[#dde9d8]'}`}>
          <div className="min-w-0 flex-1">
            <h2 className="font-sans t-base font-semibold">{lesson.sourceReview.claimStatus === 'pending' ? 'Nguồn và thông tin đang chờ đối chiếu' : 'Đã xác nhận đối chiếu trực tiếp'}</h2>
            <p className="t-sm">
              {lesson.sourceReview.claimStatus === 'pending'
                ? `${lesson.sourceReview.sourceRecognition === 'catalog-match' ? 'URL khớp một mục trong danh mục tham khảo chính thống. ' : 'URL chưa khớp mục tham khảo chính thống. '}Hãy mở nguồn, đối chiếu thông tin cụ thể, rồi xác nhận trước khi phát hành. Dịch vụ AI và kho tri thức chính phủ chưa được kết nối.`
                : 'Bạn đã xác nhận đối chiếu nội dung với nguồn. Hệ thống chỉ nhận diện nguồn, không tự xác thực sự kiện.'}
            </p>
          </div>
          {lesson.sourceReview.sourceUrl && <a href={lesson.sourceReview.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Mở nguồn <span aria-hidden>↗</span></a>}
          {lesson.sourceReview.claimStatus === 'pending' && <button type="button" id="btn-mark-source-reviewed" className="btn btn-primary btn-sm" onClick={markReviewed}><Icon name="check" /> Tôi đã đối chiếu nguồn</button>}
        </section>
      )}

      {(issues.length > 0 || hints.length > 0) && (
        <section className="card mt-4 p-4" aria-label="Kiểm tra bài học" aria-live="polite">
          {issues.length > 0 && (
            <>
              <h2 className="font-sans t-sm font-semibold text-action">Cần sửa trước khi lưu ({issues.length})</h2>
              <ul className="mt-1 list-disc pl-5 t-sm">{issues.slice(0, 8).map((i) => <li key={i}>{i}</li>)}</ul>
            </>
          )}
          {hints.length > 0 && (
            <>
              <h2 className={`font-sans t-sm font-semibold ${issues.length ? 'mt-3' : ''}`}>Để học sinh đi đủ 6 bước</h2>
              <ul className="mt-1 list-disc pl-5 t-sm muted">{hints.map((i) => <li key={i}>{i}</li>)}</ul>
            </>
          )}
        </section>
      )}

      <div className="tabs mt-5" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" className="tab" aria-selected={tab === id} data-editor-tab={id} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <div className="pt-5" role="tabpanel">
        {tab === 'content' && <ContentTab lesson={lesson} edit={edit} />}
        {tab === 'questions' && <QuestionsTab lesson={lesson} edit={edit} />}
        {tab === 'variables' && <VariablesEditor lesson={lesson} edit={edit} />}
        {tab === 'scene' && <SceneTab lesson={lesson} edit={edit} />}
        {tab === 'notes' && (
          <div className="grid max-w-4xl gap-6">
            <Field label="Ghi chú giảng dạy (chỉ giáo viên thấy)"><textarea className="field" rows={8} value={lesson.privateNotes} onChange={(e) => edit('notes', (d) => void (d.privateNotes = e.target.value))} /></Field>
            <ListEditor label="Ghi chú chính cho học sinh" items={lesson.keyNotes} onChange={(items, key) => edit(key, (d) => void (d.keyNotes = items))} addLabel="Thêm ghi chú" />
          </div>
        )}
      </div>

      <Modal
        id="modal-confirm-publish"
        open={confirmPublish}
        title="Phát hành cho học sinh?"
        onClose={() => setConfirmPublish(false)}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmPublish(false)}>Chưa phát hành</button>
            <button type="button" id="btn-confirm-publish-submit" className="btn btn-primary" onClick={() => save('Đã dạy') && setConfirmPublish(false)}>Đồng ý phát hành</button>
          </>
        }
      >
        <p>Học sinh sẽ thấy bài “{lesson.title}” từ ngày {lesson.date}. Ghi chú giảng dạy vẫn chỉ mình bạn thấy.</p>
      </Modal>
    </main>
  );
}

type TabProps = { lesson: AppLesson; edit: Edit };

function Mover({ index, count, onMove, onDelete, label }: { index: number; count: number; onMove: (to: number) => void; onDelete: () => void; label: string }) {
  return (
    <div className="flex gap-1">
      <button type="button" className="btn btn-quiet btn-sm" disabled={index === 0} aria-label={`Đưa ${label} lên`} onClick={() => onMove(index - 1)}><Icon name="up" /></button>
      <button type="button" className="btn btn-quiet btn-sm" disabled={index === count - 1} aria-label={`Đưa ${label} xuống`} onClick={() => onMove(index + 1)}><Icon name="down" /></button>
      <button type="button" className="btn btn-quiet btn-sm text-action" aria-label={`Xoá ${label}`} onClick={onDelete}><Icon name="trash" /></button>
    </div>
  );
}
const move = <T,>(list: T[], from: number, to: number) => {
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
};

function ListEditor({ label, items, onChange, addLabel }: { label: string; items: string[]; onChange: (items: string[], key: string) => void; addLabel: string }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <ol className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <input className="field" aria-label={`${label} ${i + 1}`} value={item} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)), `list.${label}.${i}`)} />
            <button type="button" className="btn btn-quiet btn-sm text-action" aria-label={`Xoá mục ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i), 'list.del')}><Icon name="trash" /></button>
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn-secondary btn-sm mt-2" onClick={() => onChange([...items, ''], 'list.add')}><Icon name="plus" /> {addLabel}</button>
    </fieldset>
  );
}

function ContentTab({ lesson, edit }: TabProps) {
  const text = (key: keyof AppLesson) => ({
    value: String(lesson[key] ?? ''),
    onChange: (e: { target: { value: string } }) => edit(`f.${key}`, (d) => void ((d as Record<string, unknown>)[key] = e.target.value))
  });
  const editSection = (i: number, key: string, fn: (s: Section) => void) => edit(`s.${i}.${key}`, (d) => fn(d.sections[i]));
  return (
    <div className="grid gap-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Đề bài" className="md:col-span-2"><input id="input-lesson-title" className="field" {...text('title')} /></Field>
        <Field label="Phụ đề" className="md:col-span-2"><input className="field" {...text('subtitle')} /></Field>
        <Field label="Ngày dạy"><input className="field" type="date" {...text('date')} /></Field>
        <Field label="Lớp"><input className="field" {...text('class')} /></Field>
        <Field label="Khối"><input className="field" {...text('grade')} /></Field>
        <Field label="Thời kỳ / năm" hint="Hiện trên sa bàn và thẻ bài"><input className="field" {...text('era')} /></Field>
        <Field label="Mục tiêu bài học" className="md:col-span-2"><textarea className="field" rows={3} {...text('objectives')} /></Field>
        <Field label="Câu hỏi trọng tâm" className="md:col-span-2"><textarea className="field" rows={3} {...text('focusQuestion')} /></Field>
        <Field label="Lời mở đầu ở bước 1" className="md:col-span-2 xl:col-span-4"><textarea className="field" rows={3} {...text('introSummary')} /></Field>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="t-xl font-semibold">Giai đoạn diễn biến ({lesson.sections.length})</h2>
          <button type="button" id="btn-add-section" className="btn btn-secondary btn-sm" onClick={() => edit('s.add', (d) => {
            d.sections.push({ id: `sec-${Date.now().toString(36)}`, title: `Giai đoạn ${d.sections.length + 1}`, narration: '', caption: '', timelineRange: Math.min(1, (d.sections.at(-1)?.timelineRange ?? 0) + 0.2), timeLabel: '' });
          })}><Icon name="plus" /> Thêm giai đoạn</button>
        </div>
        <ol className="mt-3 flex flex-col gap-4">
          {lesson.sections.map((section, i) => (
            <li key={section.id} className="card p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="t-lg font-semibold">Giai đoạn {i + 1}</h3>
                <Mover index={i} count={lesson.sections.length} label="giai đoạn" onMove={(to) => edit('s.move', (d) => move(d.sections, i, to))} onDelete={() => window.confirm(`Xoá giai đoạn "${section.title}"?`) && edit('s.del', (d) => void d.sections.splice(i, 1))} />
              </div>
              <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem_12rem]">
                <Field label="Tiêu đề"><input className="field" value={section.title} onChange={(e) => editSection(i, 'title', (s) => void (s.title = e.target.value))} /></Field>
                <Field label="Mốc thời gian"><input className="field" value={section.timeLabel} onChange={(e) => editSection(i, 'time', (s) => void (s.timeLabel = e.target.value))} /></Field>
                <Field label={`Vị trí trên sa bàn: ${Math.round(section.timelineRange * 100)}%`}>
                  <input type="range" className="player-slider" min={0} max={100} value={Math.round(section.timelineRange * 100)} onChange={(e) => editSection(i, 'range', (s) => void (s.timelineRange = Number(e.target.value) / 100))} />
                </Field>
                <Field label="Lời dẫn" className="md:col-span-3"><textarea className="field" rows={3} value={section.narration} onChange={(e) => editSection(i, 'nar', (s) => void (s.narration = e.target.value))} /></Field>
                <Field label="Chú thích" className="md:col-span-3"><input className="field" value={section.caption ?? ''} onChange={(e) => editSection(i, 'cap', (s) => void (s.caption = e.target.value))} /></Field>
              </div>
              <details className="mt-3" open={Boolean(section.source)}>
                <summary className="cursor-pointer t-sm font-semibold">Nguồn tư liệu</summary>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {(['book', 'chapter', 'publisher', 'url', 'quote', 'note'] as const).map((key) => (
                    <Field key={key} label={{ book: 'Tài liệu', chapter: 'Thiên / quyển / năm', publisher: 'Cơ quan / tác giả', url: 'Liên kết (HTTPS)', quote: 'Trích dẫn', note: 'Ghi chú' }[key]} className={key === 'quote' || key === 'note' ? 'md:col-span-2' : ''}>
                      <input className="field" value={section.source?.[key] ?? ''} onChange={(e) => editSection(i, `src.${key}`, (s) => {
                        s.source ??= { book: '' };
                        s.source[key] = e.target.value;
                        if (Object.values(s.source).every((v) => !v)) delete s.source;
                      })} />
                    </Field>
                  ))}
                </div>
              </details>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function QuestionsTab({ lesson, edit }: TabProps) {
  return (
    <div className="flex max-w-4xl flex-col gap-4">
      {lesson.questions.map((q, i) => (
        <section key={q.id} className="card p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="t-lg font-semibold">Câu {i + 1}</h3>
            <Mover index={i} count={lesson.questions.length} label="câu hỏi" onMove={(to) => edit('q.move', (d) => move(d.questions, i, to))} onDelete={() => window.confirm('Xoá câu hỏi này?') && edit('q.del', (d) => void d.questions.splice(i, 1))} />
          </div>
          <div className="mt-3 grid gap-3">
            <Field label="Nội dung câu hỏi"><textarea className="field" rows={2} value={q.text} onChange={(e) => edit(`q.${i}.text`, (d) => void (d.questions[i].text = e.target.value))} /></Field>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 t-sm"><span className="font-semibold">Dạng</span>
                <select className="field !w-auto" value={q.type} onChange={(e) => edit(`q.${i}.type`, (d) => {
                  const question = d.questions[i];
                  question.type = e.target.value as typeof q.type;
                  if (question.type === 'multiple_choice') question.options ??= [{ id: 'a', text: '', isCorrect: true, explanation: '' }, { id: 'b', text: '', isCorrect: false, explanation: '' }];
                })}>
                  <option value="multiple_choice">Trắc nghiệm</option>
                  <option value="open_discussion">Thảo luận mở</option>
                </select>
              </label>
              <label className="flex min-h-11 items-center gap-2 t-sm"><input type="checkbox" checked={Boolean(q.isExplanationReleased)} onChange={(e) => edit(`q.${i}.rel`, (d) => void (d.questions[i].isExplanationReleased = e.target.checked))} /> Cho học sinh xem giải thích</label>
            </div>
            {q.type === 'multiple_choice' ? (
              <fieldset className="flex flex-col gap-2">
                <legend className="label">Đáp án (chọn đáp án đúng)</legend>
                {(q.options ?? []).map((o, oi) => (
                  <div key={oi} className="grid gap-2 rounded-lg border border-rule p-3 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <input type="radio" className="h-[18px] w-[18px] self-center" name={`correct-${q.id}`} aria-label="Đáp án đúng" checked={o.isCorrect} onChange={() => edit(`q.${i}.correct`, (d) => d.questions[i].options!.forEach((x, j) => (x.isCorrect = j === oi)))} />
                    <input className="field" aria-label={`Đáp án ${oi + 1}`} placeholder="Đáp án" value={o.text} onChange={(e) => edit(`q.${i}.o${oi}`, (d) => void (d.questions[i].options![oi].text = e.target.value))} />
                    <input className="field" aria-label={`Giải thích đáp án ${oi + 1}`} placeholder="Giải thích" value={o.explanation} onChange={(e) => edit(`q.${i}.e${oi}`, (d) => void (d.questions[i].options![oi].explanation = e.target.value))} />
                    <button type="button" className="btn btn-quiet btn-sm text-action" aria-label="Xoá đáp án" onClick={() => edit('q.odel', (d) => void d.questions[i].options!.splice(oi, 1))}><Icon name="trash" /></button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm self-start" onClick={() => edit('q.oadd', (d) => {
                  const options = (d.questions[i].options ??= []);
                  options.push({ id: String.fromCharCode(97 + options.length), text: '', isCorrect: options.length === 0, explanation: '' });
                })}><Icon name="plus" /> Thêm đáp án</button>
              </fieldset>
            ) : (
              <Field label="Gợi ý thảo luận"><textarea className="field" rows={2} value={q.guide ?? ''} onChange={(e) => edit(`q.${i}.guide`, (d) => void (d.questions[i].guide = e.target.value))} /></Field>
            )}
          </div>
        </section>
      ))}
      <button type="button" id="btn-add-question" className="btn btn-primary self-start" onClick={() => edit('q.add', (d) => {
        d.questions.push({ id: `q-${Date.now().toString(36)}`, text: 'Câu hỏi mới', type: 'multiple_choice', isExplanationReleased: false, options: [{ id: 'a', text: '', isCorrect: true, explanation: '' }, { id: 'b', text: '', isCorrect: false, explanation: '' }] });
      })}><Icon name="plus" /> Thêm câu hỏi</button>
    </div>
  );
}

const PROPS: [string, string][] = [['palisade', 'Đồn lũy, chòi canh'], ['tents', 'Lều trại'], ['elephants', 'Đơn vị đặc biệt'], ['banners', 'Cờ hiệu'], ['fire', 'Đuốc'], ['village', 'Làng'], ['bamboo', 'Rặng tre']];
const TERRAIN_LABELS: Record<string, string> = { plain: 'Đồng bằng', river: 'Sông nước', 'mountain-pass': 'Đèo núi', basin: 'Lòng chảo', 'coast-river': 'Cửa sông ven biển', urban: 'Đô thị' };

function useDebounced<T>(value: T, ms: number) {
  const [current, setCurrent] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setCurrent(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return current;
}

function SceneTab({ lesson, edit }: TabProps) {
  const scene = useRef<SilkMapScene | null>(null);
  const sim = lesson.simulation;
  const counts = normalizeCounts(sim.unitCounts);
  // The map is repainted only when the scene data settles; colors, props and counts update live.
  const mapKey = useDebounced(JSON.stringify(sim.scene), 500);
  const setCount = (key: 'aInfantry' | 'bInfantry', value: number) =>
    edit(`count.${key}`, (d) => {
      const next = normalizeCounts(d.simulation.unitCounts);
      next[key] = value;
      d.simulation.unitCounts = next;
    });
  const setCountLive = (key: 'aInfantry' | 'bInfantry', value: number) => {
    setCount(key, value);
    scene.current?.updateUnitCounts({ [key]: value });
  };
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="lg:sticky lg:top-40">
        <Player key={mapKey} lesson={lesson} prefix="editor" onScene={(s) => (scene.current = s)} badge="Xem trước" />
      </div>
      <div className="flex flex-col gap-5">
        <Group title="Hai phe">
          {(['a', 'b'] as const).map((side) => (
            <div key={side} className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-end gap-2">
              <Field label={side === 'a' ? 'Phe A (phe ta)' : 'Phe B'}><input className="field" value={lesson.factions[side].name} onChange={(e) => edit(`fac.${side}`, (d) => void (d.factions[side].name = e.target.value))} /></Field>
              <input type="color" className="h-11 w-14 cursor-pointer rounded-lg border border-rule" aria-label={`Màu ${lesson.factions[side].name}`} value={lesson.factions[side].color} onChange={(e) => {
                const color = e.target.value;
                edit(`color.${side}`, (d) => void (d.factions[side].color = color));
                scene.current?.updateFactionColors({ [side]: color });
              }} />
            </div>
          ))}
          {(['aInfantry', 'bInfantry'] as const).map((key) => (
            <Field key={key} label={`Bộ binh ${key === 'aInfantry' ? lesson.factions.a.name : lesson.factions.b.name}: ${counts[key] ?? 45}`}>
              <input type="range" className="player-slider" min={15} max={60} value={counts[key] ?? 45} onChange={(e) => setCountLive(key, Number(e.target.value))} />
            </Field>
          ))}
        </Group>
        <Group title="Hiện trên sa bàn">
          <div className="grid grid-cols-2 gap-1">
            {PROPS.map(([key, label]) => (
              <label key={key} className="flex min-h-11 items-center gap-2 t-sm">
                <input type="checkbox" className="h-[18px] w-[18px]" checked={sim.propsConfig?.[key] !== false} onChange={(e) => {
                  const on = e.target.checked;
                  edit(`prop.${key}`, (d) => void ((d.simulation.propsConfig ??= {})[key] = on));
                  scene.current?.applyPropConfig({ ...sim.propsConfig, [key]: on });
                }} /> {label}
              </label>
            ))}
          </div>
        </Group>
        <Group title="Địa hình và nhãn">
          <Field label="Kiểu địa hình">
            <select className="field" value={sim.scene.terrain} onChange={(e) => edit('terrain', (d) => void (d.simulation.scene.terrain = e.target.value as typeof sim.scene.terrain))}>
              {TERRAINS.map((t) => <option key={t} value={t}>{TERRAIN_LABELS[t]}</option>)}
            </select>
          </Field>
          <fieldset>
            <legend className="label">Nhãn trên sa bàn (x: −120…120, z: −93…93; z dương gần người xem)</legend>
            {sim.scene.labels.map((label, i) => (
              <div key={i} className="mb-2 grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_auto] gap-2">
                <input className="field" aria-label={`Nhãn ${i + 1}`} value={label.text} onChange={(e) => edit(`lbl.${i}.t`, (d) => void (d.simulation.scene.labels[i].text = e.target.value))} />
                {[0, 1].map((axis) => (
                  <input key={axis} className="field tabular-nums" inputMode="numeric" aria-label={axis ? 'Toạ độ z' : 'Toạ độ x'} value={label.at[axis]} onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n)) edit(`lbl.${i}.${axis}`, (d) => void (d.simulation.scene.labels[i].at[axis] = n));
                  }} />
                ))}
                <button type="button" className="btn btn-quiet btn-sm text-action" aria-label="Xoá nhãn" onClick={() => edit('lbl.del', (d) => void d.simulation.scene.labels.splice(i, 1))}><Icon name="trash" /></button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => edit('lbl.add', (d) => void d.simulation.scene.labels.push({ text: 'Nhãn mới', at: [0, 0] }))}><Icon name="plus" /> Thêm nhãn</button>
          </fieldset>
        </Group>
        <Group title="Góc máy theo thời gian">
          {(sim.keyframes ?? []).map((frame, i) => (
            <div key={i} className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-2">
              <input className="field tabular-nums" inputMode="numeric" aria-label="Thời điểm (%)" value={Math.round(frame.time * 100)} onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n)) edit(`kf.${i}.t`, (d) => void (d.simulation.keyframes![i].time = Math.min(1, Math.max(0, n / 100))));
              }} />
              <select className="field" aria-label="Góc nhìn" value={frame.preset} onChange={(e) => edit(`kf.${i}.p`, (d) => void (d.simulation.keyframes![i].preset = e.target.value as (typeof CAMERA_PRESETS)[number]))}>
                {CAMERA_LABELS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
              <button type="button" className="btn btn-quiet btn-sm text-action" aria-label="Xoá mốc góc máy" onClick={() => edit('kf.del', (d) => void d.simulation.keyframes!.splice(i, 1))}><Icon name="trash" /></button>
            </div>
          ))}
          <p className="t-xs muted">Thời điểm tính theo % tiến trình mô phỏng.</p>
          <button type="button" className="btn btn-secondary btn-sm self-start" onClick={() => edit('kf.add', (d) => void (d.simulation.keyframes ??= []).push({ time: 0.5, preset: 'follow_troops' }))}><Icon name="plus" /> Thêm mốc góc máy</button>
        </Group>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card flex flex-col gap-3 p-4">
      <h3 className="t-lg font-semibold">{title}</h3>
      {children}
    </section>
  );
}
