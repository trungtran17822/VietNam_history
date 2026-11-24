// Step 5 of a lesson without a simulation (#/lesson/<id>/interactive): there is no student version
// to compare with the original, so the class's answers to the multiple-choice questions are shown
// instead. A student sees their own picks; the teacher's projected screen shows the class counts
// (sent anonymously through the class session, never stored on this device).
import { useMemo } from 'react';
import type { Role } from '../lib/auth';
import { getTeacherSession } from '../lib/class-session';
import { getQuizAnswers, type AppLesson } from '../lib/storage';
import { useClassSummary } from './ClassPanel';
import { Icon } from './ui';

export const OPINION_NOTE = 'Phần tổng kết dưới đây chỉ là ý kiến thảo luận minh họa, không thay thế cho các nghiên cứu lịch sử chính thức.';

export function OpinionSummary({ lesson, role, onBack, onFinish }: { lesson: AppLesson; role: Role; onBack: () => void; onFinish: () => void }) {
  const mine = useMemo(() => getQuizAnswers(lesson.id), [lesson.id]);
  const session = role === 'teacher' ? getTeacherSession(lesson.id) : null;
  const summary = useClassSummary(lesson.id, session?.code);
  const total = summary.data?.count ?? 0;
  const questions = lesson.questions.filter((q) => q.type === 'multiple_choice' && q.options?.length);
  return (
    <section id="screen-opinion-summary" className="screen-view active opinion-summary mx-auto flex max-w-3xl flex-col gap-4">
      <div className="prominent-simulation-banner" role="note">
        <Icon name="warning" className="mt-0.5 h-6 w-6 flex-none" />
        <div>
          <p className="banner-warning-text">Tổng kết ý kiến</p>
          <p className="mt-1 t-sm">{OPINION_NOTE}</p>
        </div>
      </div>
      <p className="card p-5 leading-relaxed" id="opinion-summary-intro">
        {role === 'teacher'
          ? 'Bài học này không có phần mô phỏng, nên không có phương án để so sánh. Dưới đây là số học sinh chọn từng đáp án (ẩn danh) để cả lớp cùng thảo luận.'
          : 'Bài học này không có phần mô phỏng, nên không có phương án để so sánh. Dưới đây là các đáp án em đã chọn; thầy cô sẽ cùng cả lớp thảo luận.'}
      </p>
      {role === 'teacher' && !session && (
        <p className="card p-5 muted" id="opinion-summary-no-session">Chưa mở phiên lớp nên chưa có số liệu của cả lớp. Mở phiên ở bước 3 để học sinh gửi đáp án.</p>
      )}
      {role === 'teacher' && summary.isError && <p className="card p-5 text-warn" role="status">Chưa tải được số liệu của lớp. Hệ thống sẽ thử lại.</p>}
      {questions.length === 0 ? (
        <p className="card p-5 muted" id="opinion-summary-empty">Bài học chưa có câu hỏi trắc nghiệm. Em hãy chia sẻ suy nghĩ của mình trong phần thảo luận trên lớp.</p>
      ) : (
        <ol id="opinion-summary-list" className="flex flex-col gap-4">
          {questions.map((q, i) => {
            const picked = q.options!.find((o) => o.id === mine[q.id]);
            const counts = summary.data?.distribution?.[q.id] ?? {};
            return (
              <li key={q.id} className="card p-5">
                <p className="font-semibold">Câu {i + 1}. {q.text}</p>
                {role !== 'teacher' && <p className="mt-1 t-sm">{picked ? `Em đã chọn: ${picked.text}` : 'Em chưa trả lời câu này.'}</p>}
                {role === 'teacher' && session && (
                  <ul className="mt-3 flex flex-col gap-2">
                    {q.options!.map((o) => {
                      const n = counts[o.id] ?? 0;
                      const pct = total ? Math.round((n / total) * 100) : 0;
                      return (
                        <li key={o.id} className="t-sm">
                          <span>{o.text}</span>
                          <span className="muted"> · <span data-opinion-count={`${q.id}:${o.id}`}>{n}</span> lượt chọn ({pct}%)</span>
                          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-page" aria-hidden>
                            <span className="block h-full rounded-full bg-lacquer" style={{ width: `${pct}%` }} />
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <div className="flex flex-wrap justify-between gap-3">
        <button id="btn-opinion-back" type="button" className="btn btn-secondary" onClick={onBack}>
          <Icon name="back" /> Quay lại câu hỏi
        </button>
        <button id="btn-opinion-finish" type="button" className="btn btn-primary" onClick={onFinish}>
          <Icon name="check" /> Hoàn thành, về trang bài học
        </button>
      </div>
    </section>
  );
}
