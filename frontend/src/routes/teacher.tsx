import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { requireUser } from '../lib/guards';
import { assessReferenceUrl, assessmentMessage, blankLesson, intakeLesson, type IntakeForm } from '../lib/intake';
import { deleteLesson, duplicateLesson, exportJSON, getAllLessons, importJSON, saveLesson, type AppLesson } from '../lib/storage';
import { fold, today } from '../lib/text';
import { Thumbnail } from '../components/Thumbnail';
import { Field, Icon, Modal, StatusChip } from '../components/ui';

export const Route = createFileRoute('/teacher')({ beforeLoad: requireUser('teacher'), component: TeacherDashboard });

const FILTERS = [['all', 'Tất cả'], ['Đã dạy', 'Đã phát hành'], ['Đã lên lịch', 'Đã lên lịch'], ['Nháp', 'Bản nháp']] as const;

function featuredOf(lessons: AppLesson[]) {
  const now = today();
  const byDate = [...lessons].sort((a, b) => a.date.localeCompare(b.date));
  return byDate.find((l) => l.date === now) ?? byDate.find((l) => l.status === 'Đã lên lịch' && l.date >= now) ?? byDate[0] ?? null;
}

function TeacherDashboard() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState(getAllLessons);
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AppLesson | null>(null);
  const [notice, setNotice] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const refresh = () => setLessons(getAllLessons());

  const featured = featuredOf(lessons);
  const shown = useMemo(() => {
    const q = fold(query.trim());
    return lessons.filter((l) => (filter === 'all' || l.status === filter) && (!q || fold(`${l.title} ${l.class} ${l.era}`).includes(q)));
  }, [lessons, filter, query]);

  const createBlank = () => {
    const lesson = saveLesson(blankLesson(user.displayName));
    navigate({ to: '/lesson/$id/edit', params: { id: lesson.id } });
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([exportJSON()], { type: 'application/json' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: `su-viet-bai-giang-${today()}.json` });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <main id="view-teacher-dashboard" className="app-view active mx-auto max-w-[90rem] px-4 pb-12 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="t-3xl font-bold">Quản lý bài giảng</h1>
          <p className="mt-1 muted">Soạn, lên lịch và phát hành bài học cho học sinh. Học sinh chỉ thấy bài đã phát hành, đến đúng ngày.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button id="btn-open-content-intake" type="button" className="btn btn-primary" onClick={() => setIntakeOpen(true)}>
            <Icon name="book" /> Tạo bài từ tư liệu
          </button>
          <button id="btn-create-lesson" type="button" className="btn btn-secondary" onClick={createBlank}>
            <Icon name="plus" /> Bài giảng trống
          </button>
        </div>
      </div>

      {featured && (
        <section className="card mt-6 grid overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]" aria-label="Bài giảng gần nhất">
          <div className="flex flex-col justify-center gap-3 p-5 sm:p-7">
            <p className="flex flex-wrap items-center gap-2 t-sm muted">
              <span className="font-semibold text-ink">{featured.date === today() ? 'Dạy hôm nay' : 'Lịch dạy gần nhất'}</span>
              <span aria-hidden>·</span> {featured.date} <span aria-hidden>·</span> {featured.class} <StatusChip status={featured.status} />
            </p>
            <h2 className="t-2xl font-semibold">{featured.title}</h2>
            <p className="max-w-2xl muted">{featured.objectives || featured.subtitle}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <Link to="/lesson/$id" params={{ id: featured.id }} className="btn btn-primary">
                <Icon name="play" /> Vào bài giảng
              </Link>
              <Link to="/lesson/$id/interactive" params={{ id: featured.id }} className="btn btn-secondary">Tiến trình 6 bước trên lớp</Link>
            </div>
          </div>
          <div className="hidden aspect-[9/7] border-l border-rule md:block">
            <Thumbnail lesson={featured} />
          </div>
        </section>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo trạng thái">
          {FILTERS.map(([value, label]) => (
            <button key={value} type="button" className="chip" data-filter={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>
              {label} <span className="muted">{value === 'all' ? lessons.length : lessons.filter((l) => l.status === value).length}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative block w-full sm:w-72">
            <span className="sr-only">Tìm bài giảng</span>
            <Icon name="search" className="icon pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 muted" />
            <input id="input-search-lessons" className="field !pl-9" type="search" placeholder="Tìm theo tên bài, lớp…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <button type="button" className="btn btn-quiet btn-sm" onClick={download}><Icon name="download" /> Xuất JSON</button>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => fileInput.current?.click()}><Icon name="upload" /> Nhập JSON</button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              if (!window.confirm('Nhập tệp sẽ thay toàn bộ bài giảng trên máy này bằng nội dung trong tệp. Tiếp tục?')) return;
              const result = importJSON(await file.text());
              setNotice(result.message);
              if (result.ok) refresh();
            }}
          />
        </div>
      </div>
      {notice && <p className="mt-3 t-sm" role="status">{notice}</p>}

      <div id="teacher-lessons-grid" className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((lesson) => (
          <article key={lesson.id} className="lesson-manage-card card flex flex-col overflow-hidden">
            <Link to="/lesson/$id" params={{ id: lesson.id }} className="block aspect-[16/7] border-b border-rule" tabIndex={-1} aria-hidden>
              <Thumbnail lesson={lesson} />
            </Link>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <div className="flex items-center justify-between gap-2 t-sm muted">
                <span className="tabular-nums">{lesson.date}</span>
                <StatusChip status={lesson.status} />
              </div>
              <h3 className="t-lg font-semibold">
                <Link to="/lesson/$id" params={{ id: lesson.id }} className="text-ink no-underline hover:underline">{lesson.title}</Link>
              </h3>
              <p className="line-clamp-2 t-sm muted">{lesson.objectives || 'Chưa có mục tiêu bài học.'}</p>
              <p className="t-xs muted">
                {lesson.class} · {lesson.sections.length} giai đoạn · {lesson.questions.length} câu hỏi · {lesson.question?.variables.length ? `${lesson.question.variables.length} biến số` : 'chưa có biến số'}
              </p>
              <div className="mt-auto flex flex-wrap items-center gap-1 pt-2">
                <Link to="/lesson/$id/edit" params={{ id: lesson.id }} className="btn btn-secondary btn-sm btn-card-edit"><Icon name="edit" /> Soạn thảo</Link>
                <Link to="/lesson/$id/preview" params={{ id: lesson.id }} className="btn btn-quiet btn-sm" aria-label={`Xem như học sinh: ${lesson.title}`}><Icon name="eye" /></Link>
                <button type="button" className="btn btn-quiet btn-sm" aria-label={`Nhân bản: ${lesson.title}`} onClick={() => (duplicateLesson(lesson.id), refresh())}><Icon name="copy" /></button>
                <button type="button" className="btn btn-quiet btn-sm ml-auto text-action" aria-label={`Xoá: ${lesson.title}`} onClick={() => setPendingDelete(lesson)}><Icon name="trash" /></button>
              </div>
            </div>
          </article>
        ))}
        {!shown.length && (
          <div className="col-span-full rounded-xl border border-dashed border-rule p-10 text-center muted">
            {lessons.length ? 'Không có bài giảng nào khớp bộ lọc.' : 'Chưa có bài giảng nào.'}
            {!lessons.length && <div className="mt-4"><button type="button" className="btn btn-primary" onClick={createBlank}><Icon name="plus" /> Tạo bài giảng đầu tiên</button></div>}
          </div>
        )}
      </div>

      <Modal
        id="modal-confirm-delete"
        open={Boolean(pendingDelete)}
        title="Xoá bài giảng?"
        onClose={() => setPendingDelete(null)}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setPendingDelete(null)}>Giữ lại</button>
            <button type="button" className="btn btn-primary" onClick={() => { deleteLesson(pendingDelete!.id); setPendingDelete(null); refresh(); }}>Xoá bài giảng</button>
          </>
        }
      >
        <p>Bài “{pendingDelete?.title}” sẽ bị xoá khỏi máy này. Thao tác này không thể hoàn tác (trừ khi bạn đã xuất JSON).</p>
      </Modal>

      <IntakeModal open={intakeOpen} onClose={() => setIntakeOpen(false)} teacher={user.displayName} onCreated={(id) => navigate({ to: '/lesson/$id/edit', params: { id } })} />
    </main>
  );
}

const EMPTY: IntakeForm = { title: '', content: '', sourceTitle: '', publisher: '', url: '', year: '', claim: '', aiInstruction: '' };
const REQUIRED: (keyof IntakeForm)[] = ['title', 'content', 'sourceTitle', 'publisher', 'url', 'claim'];

function IntakeModal({ open, onClose, teacher, onCreated }: { open: boolean; onClose: () => void; teacher: string; onCreated: (id: string) => void }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const assessment = assessReferenceUrl(form.url);
  const status = assessmentMessage(assessment);
  const set = (key: keyof IntakeForm) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (REQUIRED.some((k) => !form[k].trim())) return setError('Hãy điền đủ các mục bắt buộc (có dấu *).');
    if (assessment.status === 'invalid' || assessment.status === 'https-required' || assessment.status === 'empty') {
      setError('Hãy nhập một đường dẫn HTTPS hợp lệ để lưu nguồn tham khảo.');
      return document.getElementById('intake-source-url')?.focus();
    }
    const trimmed = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])) as IntakeForm;
    const lesson = saveLesson(intakeLesson(trimmed, assessment, teacher));
    setForm(EMPTY);
    setError('');
    onClose();
    onCreated(lesson.id);
  };
  const toneClass = { neutral: 'muted', warning: 'text-warn', recognized: 'text-ok', review: 'text-ink' }[status.tone];

  return (
    <Modal id="modal-content-intake" open={open} title="Tạo bài nháp từ tư liệu" onClose={onClose}>
      <p className="t-sm muted">Dán ghi chú hoặc đoạn tư liệu và nguồn của nó. Hệ thống chỉ nhận diện đường dẫn; bạn sẽ tự đối chiếu nội dung trước khi phát hành.</p>
      <form id="form-content-intake" className="mt-4 flex flex-col gap-4" noValidate onSubmit={submit}>
        <Field label="Tên bài học *"><input id="intake-lesson-title" className="field" maxLength={140} placeholder="Ví dụ: Chiến thắng Ngọc Hồi – Đống Đa" value={form.title} onChange={set('title')} /></Field>
        <Field label="Nội dung cần biên tập *"><textarea id="intake-lesson-content" className="field" maxLength={12000} value={form.content} onChange={set('content')} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tên tài liệu / nguồn *"><input id="intake-source-title" className="field" maxLength={180} value={form.sourceTitle} onChange={set('sourceTitle')} /></Field>
          <Field label="Cơ quan / tác giả *"><input id="intake-source-publisher" className="field" maxLength={180} placeholder="Ví dụ: Bộ Giáo dục và Đào tạo" value={form.publisher} onChange={set('publisher')} /></Field>
          <Field label="Liên kết nguồn (HTTPS) *"><input id="intake-source-url" className="field" type="url" inputMode="url" placeholder="https://…" value={form.url} onChange={set('url')} aria-describedby="source-intake-status" /></Field>
          <Field label="Năm xuất bản"><input id="intake-source-year" className="field" inputMode="numeric" maxLength={5} placeholder="2024" value={form.year} onChange={set('year')} /></Field>
        </div>
        <p id="source-intake-status" className={`t-sm ${toneClass}`} aria-live="polite">{status.text}</p>
        <Field label="Thông tin cụ thể cần đối chiếu *"><textarea id="intake-source-claim" className="field" maxLength={2000} placeholder="Sự kiện, mốc thời gian, nhân vật hoặc nhận định được nguồn hỗ trợ…" value={form.claim} onChange={set('claim')} /></Field>
        <Field label="Yêu cầu biên tập cho AI (tuỳ chọn)" hint="Được lưu lại; dịch vụ AI chưa được kết nối."><input id="intake-ai-instruction" className="field" maxLength={500} value={form.aiInstruction} onChange={set('aiInstruction')} /></Field>
        <p id="content-intake-error" className="t-sm font-semibold text-action" role="alert" hidden={!error}>{error}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Huỷ</button>
          <button type="submit" className="btn btn-primary">Tạo bài nháp và mở biên tập <Icon name="next" /></button>
        </div>
      </form>
    </Modal>
  );
}

