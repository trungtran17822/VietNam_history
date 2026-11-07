// Class session UI (F10, F11). Stage 3: the teacher's live panel or the student's join card.
// Stage 6: the optional anonymous survey. A failed request shows a Vietnamese message and the
// lesson carries on.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import * as api from '../lib/class-session';
import type { Lesson } from '../lib/lesson-schema';
import type { Role } from '../lib/auth';
import { Icon } from './ui';

const RATING_QUESTIONS = [
  { key: 'interest', label: 'Em thấy bài học hôm nay thú vị như thế nào?', low: 'Chưa thú vị', high: 'Rất thú vị' },
  { key: 'visualize', label: 'Em hình dung diễn biến trận đánh rõ đến đâu?', low: 'Chưa rõ', high: 'Rất rõ' },
  { key: 'again', label: 'Em có muốn học các bài khác theo cách này không?', low: 'Không muốn', high: 'Rất muốn' }
];

type Tone = '' | 'ok' | 'warn';
type Line = { text: string; tone: Tone };
const Status = ({ line }: { line: Line }) => (
  <p className="class-panel-status" role="status" data-tone={line.tone}>
    {line.text}
  </p>
);
const errorText = (error: unknown) => (error instanceof Error ? error.message : api.MESSAGES.offline);

type PanelLesson = Pick<Lesson, 'id' | 'question'>;

export function ClassPanel({ lesson, role }: { lesson: PanelLesson; role: Role }) {
  if (role === 'teacher') return <TeacherPanel lesson={lesson} />;
  if (!api.isConfigured()) return null;
  return <StudentPanel lesson={lesson} />;
}

function TeacherPanel({ lesson }: { lesson: PanelLesson }) {
  const [session, setSession] = useState(() => api.getTeacherSession(lesson.id));
  const [line, setLine] = useState<Line>({ text: '', tone: '' });
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const summary = useQuery({
    queryKey: ['class-summary', lesson.id, session?.code],
    queryFn: () => api.fetchSummary(lesson.id),
    enabled: Boolean(session),
    // 304 polls are free on the server; back off while it is unreachable. Hidden tabs do not poll.
    refetchInterval: (query) => (query.state.status === 'error' ? api.API_CONFIG.backoffMs : api.API_CONFIG.pollIntervalMs),
    refetchIntervalInBackground: false,
    retry: false
  });
  // fetchSummary forgets a session the server no longer knows (deleted elsewhere, purged).
  useEffect(() => {
    if (session && summary.isError && !api.getTeacherSession(lesson.id)) {
      setSession(null);
      setLine({ text: errorText(summary.error), tone: 'warn' });
    }
  }, [session, summary.isError, summary.error, lesson.id]);

  const open = async () => {
    setBusy(true);
    setLine({ text: 'Đang mở phiên…', tone: '' });
    try {
      setSession(await api.openSession(lesson.id));
      setLine({ text: '', tone: '' });
    } catch (error) {
      setLine({ text: errorText(error), tone: 'warn' });
    } finally {
      setBusy(false);
    }
  };

  if (!session) {
    const configured = api.isConfigured();
    return (
      <>
        <h3 className="t-lg font-semibold">Cả lớp cùng trả lời</h3>
        <p className="mt-1 t-sm muted">Mở phiên để học sinh gửi lựa chọn từ điện thoại hoặc máy tính. Màn chiếu hiện số học sinh chọn từng phương án. Không cần tên hay tài khoản.</p>
        {configured && (
          <button type="button" className="btn btn-primary mt-3 w-full" data-class-open disabled={busy} onClick={open}>
            <Icon name="people" /> Mở phiên lớp
          </button>
        )}
        <div className="mt-2">
          <Status line={configured ? line : { text: api.MESSAGES.not_configured, tone: 'warn' }} />
        </div>
      </>
    );
  }

  const data = summary.data;
  const isOpen = data ? data.open : Date.now() < session.expiresAt;
  const count = data?.count ?? 0;
  const pollLine: Line = summary.isError ? { text: errorText(summary.error), tone: 'warn' } : !data && summary.isFetching ? { text: 'Đang tải số liệu…', tone: '' } : line;
  const variables = lesson.question?.variables ?? [];
  const ratings = data?.ratings
    ? RATING_QUESTIONS.map((q) => ({ q, r: data.ratings![q.key] })).filter(({ r }) => r && r.n)
    : [];

  const exportCsv = async () => {
    setBusy(true);
    try {
      const file = await api.exportCsv(lesson.id);
      const url = URL.createObjectURL(file.blob);
      const link = Object.assign(document.createElement('a'), { href: url, download: file.filename });
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setLine({ text: `Đã tải ${file.filename}.`, tone: 'ok' });
    } catch (error) {
      setLine({ text: errorText(error), tone: 'warn' });
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!window.confirm(`Xoá phiên ${session.code} và toàn bộ câu trả lời? Thao tác này không thể hoàn tác.`)) return;
    try {
      await api.deleteSession(lesson.id);
      queryClient.removeQueries({ queryKey: ['class-summary', lesson.id] });
      setSession(null);
      setLine({ text: 'Đã xoá phiên và toàn bộ câu trả lời.', tone: 'ok' });
    } catch (error) {
      setLine({ text: errorText(error), tone: 'warn' });
    }
  };

  return (
    <>
      <p className="flex items-center gap-2 t-sm font-semibold">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${isOpen ? 'bg-ok' : 'bg-muted'}`} aria-hidden />
        {isOpen ? 'Phiên lớp đang nhận câu trả lời' : 'Phiên lớp đã hết hạn nhận câu trả lời'}
      </p>
      <div className="mt-3 rounded-xl bg-page px-4 py-3 text-center">
        <span className="block t-sm muted">Mã vào lớp</span>
        <strong className="class-code block" data-class-code={session.code} aria-label={`Mã vào lớp ${session.code.split('').join(' ')}`}>
          {api.formatCode(session.code)}
        </strong>
        <span className="block t-xs muted">Học sinh mở bài này, đến bước 3 và nhập mã.</span>
      </div>
      <p className="mt-3">
        <strong className="t-xl font-serif" data-class-count>{count}</strong> học sinh đã gửi lựa chọn
      </p>
      <div className="mt-2 flex flex-col gap-3">
        {variables.map((variable) => {
          const counts = data?.distribution?.[variable.id] ?? {};
          return (
            <div key={variable.id}>
              <p className="t-sm font-semibold">{variable.title.replace(/^\d+\.\s*/, '')}</p>
              <ul className="mt-1 flex flex-col gap-1.5">
                {variable.options.map((option) => {
                  const n = counts[option.id] ?? 0;
                  const pct = count ? Math.round((n / count) * 100) : 0;
                  return (
                    <li key={option.id} className={`grid grid-cols-[minmax(0,1fr)_5rem_1.5rem] items-center gap-2 t-sm${option.isOriginal ? ' is-original' : ''}`}>
                      <span className="truncate" title={option.name}>
                        {option.shortName || option.name}
                        {option.isOriginal && <span className="muted"> (cách gốc)</span>}
                      </span>
                      <span className="class-bar-track" aria-hidden>
                        <span className="class-bar-fill" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="text-right font-semibold tabular-nums" data-option-count={`${variable.id}:${option.id}`}>{n}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      {ratings.length > 0 && (
        <p className="mt-3 t-sm" data-class-ratings>
          <span className="font-semibold">Khảo sát: </span>
          {ratings.map(({ q, r }, i) => (
            <span key={q.key}>
              {i > 0 && ' · '}
              <strong>{r!.avg}</strong>/5 {q.high.toLowerCase()} <span className="muted">({r!.n})</span>
            </span>
          ))}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-secondary btn-sm" data-class-export disabled={busy} onClick={exportCsv}>
          <Icon name="download" /> Tải dữ liệu (CSV)
        </button>
        <button type="button" className="btn btn-danger btn-sm" data-class-delete onClick={remove}>
          <Icon name="trash" /> Xoá phiên
        </button>
        {!isOpen && (
          <button type="button" className="btn btn-primary btn-sm" data-class-new disabled={busy} onClick={open}>
            Mở phiên mới
          </button>
        )}
      </div>
      <div className="mt-2">
        <Status line={pollLine} />
      </div>
      <p className="mt-1 t-xs muted">Dữ liệu ẩn danh: không lưu tên, email hay địa chỉ IP. Tự xoá sau 180 ngày.</p>
    </>
  );
}

function StudentPanel({ lesson }: { lesson: PanelLesson }) {
  const [joined, setJoined] = useState(() => api.getJoined(lesson.id));
  const [line, setLine] = useState<Line>({ text: '', tone: '' });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  if (joined) {
    return (
      <>
        <p>
          Đã vào lớp <strong className="font-serif t-lg tracking-widest" data-class-joined>{api.formatCode(joined.code)}</strong>
        </p>
        <p className="mt-1 t-sm muted">Khi em bấm "Chạy mô phỏng", lựa chọn sẽ được gửi ẩn danh để cả lớp cùng xem. Em có thể đổi ý và chạy lại.</p>
        <button
          type="button"
          className="btn btn-quiet btn-sm mt-2 underline"
          data-class-leave
          onClick={() => {
            api.leave();
            setJoined(null);
            setLine({ text: 'Đã rời phiên lớp. Bài học vẫn tiếp tục trên máy em.', tone: 'ok' });
          }}
        >
          Rời phiên lớp
        </button>
        <Status line={line} />
      </>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setLine({ text: 'Đang kiểm tra mã…', tone: '' });
    try {
      setJoined(await api.join(code, lesson.id));
      setLine({ text: 'Đã vào lớp. Hãy chọn phương án rồi bấm "Chạy mô phỏng".', tone: 'ok' });
    } catch (error) {
      setLine({ text: errorText(error), tone: 'warn' });
      document.getElementById('class-join-code')?.focus();
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <h3 className="t-lg font-semibold">Tham gia cùng lớp</h3>
      <form className="class-join-form mt-2" noValidate onSubmit={submit}>
        <label htmlFor="class-join-code" className="label">Mã phiên thầy cô chiếu trên màn hình</label>
        <div className="flex gap-2">
          <input
            id="class-join-code"
            className="field min-w-0 flex-1 font-semibold uppercase tracking-widest"
            maxLength={7}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="VD: K7M2QX"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={busy}>Vào lớp</button>
        </div>
      </form>
      <p className="mt-2 t-sm muted">Không bắt buộc. Không cần tên; lựa chọn được gửi ẩn danh.</p>
      <Status line={line} />
    </>
  );
}

/** Sends the student's choices when the device joined a session. Resolves to a toast line, or ''. */
export async function submitChoices(lessonId: string, choices: Record<string, string>, startedAt: number): Promise<Line> {
  if (!api.isConfigured() || !api.getJoined(lessonId)) return { text: '', tone: '' };
  try {
    await api.submit(lessonId, { choices, durationSec: Math.max(0, Math.round((Date.now() - startedAt) / 1000)) });
    return { text: 'Đã gửi lựa chọn tới lớp.', tone: 'ok' };
  } catch (error) {
    return { text: `${errorText(error)} Bấm "Chạy mô phỏng" lần nữa để gửi lại.`, tone: 'warn' };
  }
}

export function Survey({ lessonId, startedAt }: { lessonId: string; startedAt: number }) {
  const [line, setLine] = useState<Line>({ text: '', tone: '' });
  const [sent, setSent] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ratings = Object.fromEntries(RATING_QUESTIONS.map((q) => [q.key, form.get(`rating-${q.key}`) ? Number(form.get(`rating-${q.key}`)) : null]));
    setSent(true);
    try {
      await api.submit(lessonId, { ratings, durationSec: Math.max(0, Math.round((Date.now() - startedAt) / 1000)) });
      setLine({ text: 'Cảm ơn em! Ý kiến đã được gửi ẩn danh.', tone: 'ok' });
    } catch (error) {
      setSent(false);
      setLine({ text: errorText(error), tone: 'warn' });
    }
  };
  return (
    <section id="class-survey" className="class-panel mt-6" aria-label="Khảo sát ẩn danh">
      <h3 className="t-lg font-semibold">
        Ý kiến của em <span className="t-sm font-normal muted">(ẩn danh, có thể bỏ qua)</span>
      </h3>
      <form className="mt-3 flex flex-col gap-4" onSubmit={submit}>
        {RATING_QUESTIONS.map((q) => (
          <fieldset key={q.key}>
            <legend className="t-sm font-semibold">{q.label}</legend>
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="rating-pill">
                  <input type="radio" name={`rating-${q.key}`} value={n} aria-label={`${n} trên 5`} />
                  <span aria-hidden>{n}</span>
                </label>
              ))}
            </div>
            <p className="mt-1 flex max-w-[16.5rem] justify-between t-xs muted">
              <span>{q.low}</span>
              <span>{q.high}</span>
            </p>
          </fieldset>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={sent}>Gửi ý kiến</button>
          <Status line={line} />
        </div>
      </form>
    </section>
  );
}

export const surveyVisible = (lessonId: string, role: Role) => role === 'student' && api.isConfigured() && Boolean(api.getJoined(lessonId));
