// Step 5 of a lesson without a simulation (#/lesson/<id>/interactive): there is no student
// version to compare with the original, so the class sees its own answers instead. Counts are
// per device and anonymous (lib/storage.ts), and the page says so.
import { useMemo } from 'react';
import { getQuizAnswers, type AppLesson } from '../lib/storage';
import { Icon } from './ui';

export const OPINION_NOTE = 'Phần tổng kết dưới đây chỉ là ý kiến thảo luận minh họa, không thay thế cho các nghiên cứu lịch sử chính thức.';

export function OpinionSummary({ lesson, onBack, onFinish }: { lesson: AppLesson; onBack: () => void; onFinish: () => void }) {
  const answers = useMemo(() => getQuizAnswers(lesson.id), [lesson.id]);
  const questions = lesson.questions.filter((q) => q.type === 'multiple_choice' && q.options?.length);
  return (
    <section id="screen-opinion-summary" className="screen-view active opinion-summary mx-auto flex max-w-3xl flex-col gap-4">
      <div className="prominent-simulation-banner" role="note">
        <Icon name="warning" className="mt-0.5 h-6 w-6 flex-none" />
        <div>
          <p className="banner-warning-text">Tổng kết ý kiến của lớp</p>
          <p className="mt-1 t-sm">{OPINION_NOTE}</p>
        </div>
      </div>
      <p className="card p-5 leading-relaxed" id="opinion-summary-intro">
        Bài học này không có phần mô phỏng, nên không có phương án để so sánh. Dưới đây là các câu trả lời của em và số lượt chọn của từng đáp án trên thiết bị này, để cả lớp cùng thảo luận. Em trả lời các câu hỏi ở mục Câu hỏi của bài học.
      </p>
      {questions.length === 0 ? (
        <p className="card p-5 muted" id="opinion-summary-empty">Bài học chưa có câu hỏi trắc nghiệm. Em hãy chia sẻ suy nghĩ của mình trong phần thảo luận trên lớp.</p>
      ) : (
        <ol id="opinion-summary-list" className="flex flex-col gap-4">
          {questions.map((q, i) => {
            const tally = answers.tally[q.id] ?? {};
            const total = Object.values(tally).reduce((n, v) => n + v, 0);
            const mine = q.options!.find((o) => o.id === answers.mine[q.id]);
            return (
              <li key={q.id} className="card p-5">
                <p className="font-semibold">Câu {i + 1}. {q.text}</p>
                <p className="mt-1 t-sm">{mine ? `Em đã chọn: ${mine.text}` : 'Em chưa trả lời câu này.'}</p>
                <ul className="mt-3 flex flex-col gap-2">
                  {q.options!.map((o) => {
                    const n = tally[o.id] ?? 0;
                    const pct = total ? Math.round((n / total) * 100) : 0;
                    return (
                      <li key={o.id} className="t-sm">
                        <span className={o.id === mine?.id ? 'font-semibold' : ''}>{o.text}</span>
                        <span className="muted"> · {n} lượt chọn ({pct}%)</span>
                        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-page" aria-hidden>
                          <span className="block h-full rounded-full bg-lacquer" style={{ width: `${pct}%` }} />
                        </span>
                      </li>
                    );
                  })}
                </ul>
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
